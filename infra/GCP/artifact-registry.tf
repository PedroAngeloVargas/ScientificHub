resource "google_artifact_registry_repository" "imagens" {
  repository_id = var.prefixo
  location      = var.regiao
  format        = "DOCKER"
  description   = "Imagens do ScientificHub (auth, perfil, academico, match, frontend)"

  cleanup_policies {
    id     = "manter-recentes"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policies {
    id     = "apagar-antigas"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 dias
    }
  }

  depends_on = [google_project_service.apis]
}
