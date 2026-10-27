# Cluster GKE Standard zonal e privado.
# Zonal: o free tier do GKE cobre a taxa de gestão de 1 cluster zonal por conta de faturação.
# Privado: os nós não têm IP público; a saída para a internet é feita pelo Cloud NAT.

resource "google_container_cluster" "principal" {
  name     = "${var.prefixo}-gke"
  location = var.zona

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.gke.id

  # O node pool padrão é removido e substituído pelo node pool gerido abaixo
  remove_default_node_pool = true
  initial_node_count       = 1

  deletion_protection = var.protecao_exclusao

  release_channel {
    channel = "REGULAR"
  }

  # VPC-native (IPs de Pods/Services vindos das faixas secundárias da subnet)
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false # A API do Kubernetes fica acessível, mas só das redes autorizadas
    master_ipv4_cidr_block  = var.cidr_control_plane
  }

  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.redes_autorizadas_control_plane
      content {
        cidr_block   = cidr_blocks.value
        display_name = "autorizado-${cidr_blocks.key}"
      }
    }
  }

  # Workload Identity: Pods usam contas de serviço do GCP sem chaves JSON
  workload_identity_config {
    workload_pool = "${var.projeto_id}.svc.id.goog"
  }

  # Apenas componentes de sistema, para reduzir o custo de logs/métricas
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = false
    }
  }

  addons_config {
    http_load_balancing {
      disabled = false # Necessário para o Ingress (Load Balancer HTTP(S))
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_container_node_pool" "principal" {
  name     = "${var.prefixo}-pool"
  cluster  = google_container_cluster.principal.id
  location = var.zona

  autoscaling {
    min_node_count = var.gke_nos_min
    max_node_count = var.gke_nos_max
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.gke_tipo_maquina
    spot         = var.gke_spot
    disk_type    = "pd-standard"
    disk_size_gb = var.gke_disco_gb

    service_account = google_service_account.gke_nos.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    tags = [local.tag_gke_nos]

    labels = {
      app = var.prefixo
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  depends_on = [google_project_iam_member.gke_nos]
}
