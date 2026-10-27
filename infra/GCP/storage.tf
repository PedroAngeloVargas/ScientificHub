# Acesso do academico-service ao bucket de uploads (PDFs e imagens).
# O bucket em si é criado pelo bootstrap/setup-pipeline.sh, fora deste Terraform, para que o
# "terraform destroy" (usado para poupar créditos) não apague os ficheiros dos usuários.

locals {
  bucket_uploads = var.bucket_uploads != "" ? var.bucket_uploads : "${var.projeto_id}-uploads"

  # Conta do Kubernetes que roda o academico-service (namespace/nome usados nos manifestos)
  ksa_academico = "scientifichub/academico-service"
}

resource "google_service_account" "academico" {
  account_id   = "${var.prefixo}-academico"
  display_name = "ScientificHub - academico-service (uploads)"
}

resource "google_storage_bucket_iam_member" "academico_uploads" {
  bucket = local.bucket_uploads
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.academico.email}"
}

# Workload Identity: o pod do academico-service usa esta conta sem chave JSON
resource "google_service_account_iam_member" "academico_workload_identity" {
  service_account_id = google_service_account.academico.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.projeto_id}.svc.id.goog[${local.ksa_academico}]"

  # O pool de identidades (<projeto>.svc.id.goog) só existe depois de o cluster ser criado
  depends_on = [google_container_cluster.principal]
}
