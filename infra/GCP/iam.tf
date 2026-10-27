resource "google_service_account" "gke_nos" {
  account_id   = "${var.prefixo}-gke-nodes"
  display_name = "ScientificHub - nós do GKE"
}

locals {
  papeis_gke_nos = [
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
  ]
}

resource "google_project_iam_member" "gke_nos" {
  for_each = toset(local.papeis_gke_nos)

  project = var.projeto_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nos.email}"
}

resource "google_service_account" "db" {
  account_id   = "${var.prefixo}-postgres-vm"
  display_name = "ScientificHub - VM do PostgreSQL"
}

resource "google_project_iam_member" "db_logs" {
  project = var.projeto_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.db.email}"
}
