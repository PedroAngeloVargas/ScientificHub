# Conta usada pelas pipelines de imagens e de deploy (.github/workflows/imagens.yml).
# Separada da conta do Terraform: só envia imagens para este repositório e faz deploy no cluster.

data "google_project" "atual" {}

resource "google_service_account" "deploy" {
  account_id   = "${var.prefixo}-deploy"
  display_name = "ScientificHub - pipeline de imagens e deploy"
}

# Enviar imagens apenas para o repositório do ScientificHub
resource "google_artifact_registry_repository_iam_member" "deploy_push" {
  project    = var.projeto_id
  location   = google_artifact_registry_repository.imagens.location
  repository = google_artifact_registry_repository.imagens.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deploy.email}"
}

# Aplicar os manifestos no GKE (Deployments, Services, Ingress...)
resource "google_project_iam_member" "deploy_gke" {
  project = var.projeto_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Mesmo pool de identidades do GitHub criado pelo bootstrap; só este repositório pode usar a conta
resource "google_service_account_iam_member" "deploy_github" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.atual.number}/locations/global/workloadIdentityPools/github/attribute.repository/${var.repositorio_github}"
}
