resource "google_compute_network" "vpc" {
  name                    = "${var.prefixo}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.apis]
}

# Subnet dos nós do GKE, com faixas secundárias para Pods e Services (cluster VPC-native)
resource "google_compute_subnetwork" "gke" {
  name                     = "${var.prefixo}-subnet-gke"
  network                  = google_compute_network.vpc.id
  region                   = var.regiao
  ip_cidr_range            = var.cidr_subnet_gke
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.cidr_pods
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.cidr_services
  }
}

# Subnet privada do banco: nenhuma VM aqui tem IP público
resource "google_compute_subnetwork" "db" {
  name                     = "${var.prefixo}-subnet-db"
  network                  = google_compute_network.vpc.id
  region                   = var.regiao
  ip_cidr_range            = var.cidr_subnet_db
  private_ip_google_access = true
}

# ---------- Saída para a internet (Cloud NAT) ----------
# Nós do GKE e VM do banco não têm IP público; o NAT permite que baixem imagens e pacotes (apt install postgresql)

resource "google_compute_router" "router" {
  name    = "${var.prefixo}-router"
  network = google_compute_network.vpc.id
  region  = var.regiao
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.prefixo}-nat"
  router                             = google_compute_router.router.name
  region                             = var.regiao
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# IP público fixo para o Ingress/Load Balancer da aplicação (aponte o DNS para ele)
resource "google_compute_global_address" "ingress" {
  name = "${var.prefixo}-ingress-ip"

  depends_on = [google_project_service.apis]
}
