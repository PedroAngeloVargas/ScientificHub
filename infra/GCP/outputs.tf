output "gke_nome" {
  description = "Nome do cluster GKE."
  value       = google_container_cluster.principal.name
}

output "gke_credenciais" {
  description = "Comando para configurar o kubectl."
  value       = "gcloud container clusters get-credentials ${google_container_cluster.principal.name} --zone ${var.zona} --project ${var.projeto_id}"
}

output "postgres_ip_interno" {
  description = "IP privado da VM do PostgreSQL (host da DATABASE_URL dos serviços)."
  value       = google_compute_address.db_interno.address
}

output "postgres_ssh" {
  description = "Comando para acessar a VM do banco via IAP."
  value       = "gcloud compute ssh ${google_compute_instance.postgres.name} --zone ${var.zona} --project ${var.projeto_id} --tunnel-through-iap"
}

output "ingress_ip" {
  description = "IP público fixo para o Ingress da aplicação (use no DNS e na anotação kubernetes.io/ingress.global-static-ip-name)."
  value       = google_compute_global_address.ingress.address
}

output "ingress_ip_nome" {
  description = "Nome do IP estático global, para a anotação do Ingress."
  value       = google_compute_global_address.ingress.name
}

output "artifact_registry" {
  description = "Prefixo das imagens Docker (docker push <prefixo>/auth-service:tag)."
  value       = "${var.regiao}-docker.pkg.dev/${var.projeto_id}/${google_artifact_registry_repository.imagens.repository_id}"
}

output "bucket_uploads" {
  description = "Bucket dos PDFs e imagens (variável GCS_BUCKET do academico-service)."
  value       = local.bucket_uploads
}

output "academico_service_account" {
  description = "Conta GCP do academico-service (anotação iam.gke.io/gcp-service-account da ServiceAccount do Kubernetes)."
  value       = google_service_account.academico.email
}

output "deploy_service_account" {
  description = "Conta da pipeline de imagens/deploy (variável GCP_DEPLOY_SERVICE_ACCOUNT no GitHub)."
  value       = google_service_account.deploy.email
}
