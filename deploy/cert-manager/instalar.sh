#!/usr/bin/env bash
# Instala ou atualiza o cert-manager no cluster. Executar localmente, com uma conta admin do cluster:
#   gcloud container clusters get-credentials scientifichub-gke --zone us-central1-a --project <PROJETO>
#   ./deploy/cert-manager/instalar.sh
#
# Fica fora da pipeline de deploy porque cria CRDs e papéis de RBAC do cluster, que a conta de deploy
# (roles/container.developer) não pode criar. O Issuer e o Certificate ficam no chart da aplicação.
set -euo pipefail

VERSAO="v1.21.3"
PASTA="$(cd "$(dirname "$0")" && pwd)"

helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version "$VERSAO" \
  --namespace cert-manager --create-namespace \
  --values "$PASTA/values.yaml" \
  --wait --timeout 5m

kubectl -n cert-manager get pods
