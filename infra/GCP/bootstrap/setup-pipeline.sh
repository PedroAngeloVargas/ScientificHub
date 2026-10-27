#!/usr/bin/env bash
# Prepara o projeto GCP para a pipeline de infraestrutura (.github/workflows/infra.yml).
# Executar UMA vez, localmente, com uma conta Owner do projeto:
#   gcloud auth login
#   ./infra/GCP/bootstrap/setup-pipeline.sh <PROJECT_ID> [REGIAO] [ZONA]
#
# Cria (e é seguro executar de novo, pois só cria o que não existe):
#   1. APIs necessárias para a federação de identidade e o estado remoto
#   2. Buckets GCS: estado do Terraform (versionado) e uploads da aplicação (PDFs e imagens).
#      Ficam fora do Terraform de propósito: o "destroy" da infra não apaga o estado nem os ficheiros dos usuários
#   2b. Disco de dados do PostgreSQL (20 GB), pelo mesmo motivo: sobrevive ao "destroy" e é religado na VM nova
#   3. Conta de serviço "terraform-ci" com os papéis mínimos para criar a infra
#   4. Workload Identity Federation: o GitHub Actions autentica-se sem chave JSON,
#      e apenas este repositório pode usar a conta de serviço
set -euo pipefail

PROJECT_ID="${1:?Uso: $0 <PROJECT_ID> [REGIAO] [ZONA]}"
REGIAO="${2:-us-central1}"
ZONA="${3:-${REGIAO}-a}"  # Deve ser a mesma zona da VM (variável GCP_ZONE)
REPO="PedroAngeloVargas/ScientificHub"

BUCKET="${PROJECT_ID}-tfstate"
BUCKET_UPLOADS="${PROJECT_ID}-uploads"
DISCO_DB="scientifichub-postgres-dados"
SA_NAME="terraform-ci"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL="github"
PROVIDER="scientifichub"

# Papéis da conta da pipeline: o necessário para os recursos de infra/GCP/*.tf
PAPEIS=(
  roles/compute.admin                     # VPC, subnets, NAT, firewall, VM, IPs
  roles/container.admin                   # Cluster e node pool do GKE
  roles/artifactregistry.admin            # Repositório de imagens
  roles/iam.serviceAccountAdmin           # Contas de serviço dos nós e da VM
  roles/iam.serviceAccountUser            # Associar essas contas aos nós e à VM
  roles/resourcemanager.projectIamAdmin   # Conceder papéis às contas acima
  roles/serviceusage.serviceUsageAdmin    # Ativar APIs (apis.tf)
)

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

echo "==> 1/4 Ativando APIs"
gcloud services enable \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com serviceusage.googleapis.com storage.googleapis.com \
  --project "$PROJECT_ID"

echo "==> 2/4 Buckets: gs://$BUCKET (estado) e gs://$BUCKET_UPLOADS (uploads)"
if ! gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" \
    --project "$PROJECT_ID" --location "$REGIAO" \
    --uniform-bucket-level-access --public-access-prevention
fi
# Versionamento: permite recuperar um estado anterior se algo correr mal
gcloud storage buckets update "gs://$BUCKET" --versioning >/dev/null

# Uploads: privado; só o academico-service lê e grava (permissão dada pelo Terraform, em storage.tf)
if ! gcloud storage buckets describe "gs://$BUCKET_UPLOADS" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET_UPLOADS" \
    --project "$PROJECT_ID" --location "$REGIAO" \
    --uniform-bucket-level-access --public-access-prevention
fi

echo "==> Disco de dados do PostgreSQL: $DISCO_DB ($ZONA)"
if ! gcloud compute disks describe "$DISCO_DB" --project "$PROJECT_ID" --zone "$ZONA" >/dev/null 2>&1; then
  gcloud services enable compute.googleapis.com --project "$PROJECT_ID"
  gcloud compute disks create "$DISCO_DB" --project "$PROJECT_ID" --zone "$ZONA" \
    --size 20GB --type pd-standard
fi

echo "==> 3/4 Conta de serviço: $SA_EMAIL"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" \
    --display-name "ScientificHub - pipeline Terraform"
fi
for papel in "${PAPEIS[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$SA_EMAIL" --role "$papel" --condition=None --quiet >/dev/null
done
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member "serviceAccount:$SA_EMAIL" --role roles/storage.objectAdmin >/dev/null
# A pipeline gere as permissões do bucket de uploads (storage.tf)
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET_UPLOADS" \
  --member "serviceAccount:$SA_EMAIL" --role roles/storage.admin >/dev/null

echo "==> 4/4 Workload Identity Federation (GitHub -> GCP)"
if ! gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT_ID" --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT_ID" --location global \
    --display-name "GitHub Actions"
fi
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT_ID" \
    --location global --workload-identity-pool "$POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --project "$PROJECT_ID" --location global --workload-identity-pool "$POOL" \
    --display-name "ScientificHub" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository == '${REPO}'"
fi
# Só tokens emitidos para este repositório podem assumir a conta de serviço
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}" \
  >/dev/null

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"

cat <<EOF

Pronto. Configure estas variáveis no GitHub (Settings > Secrets and variables > Actions > Variables),
ou com o gh CLI:

  gh variable set GCP_PROJECT_ID          --body "$PROJECT_ID"
  gh variable set GCP_REGION              --body "$REGIAO"
  gh variable set GCP_ZONE                --body "$ZONA"
  gh variable set GCP_WIF_PROVIDER        --body "$WIF_PROVIDER"
  gh variable set GCP_TF_SERVICE_ACCOUNT  --body "$SA_EMAIL"
  gh variable set TF_STATE_BUCKET         --body "$BUCKET"
  gh variable set GKE_AUTHORIZED_NETWORKS --body '["SEU_IP/32"]'

Depois crie o ambiente "producao" (Settings > Environments) com você como "Required reviewer",
para que nenhum apply/destroy rode sem a sua aprovação.
EOF
