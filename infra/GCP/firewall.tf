locals {
  tag_gke_nos = "${var.prefixo}-gke-no"
  tag_db      = "${var.prefixo}-postgres"

  # Faixa do Identity-Aware Proxy (SSH sem IP público: gcloud compute ssh --tunnel-through-iap)
  cidr_iap = "35.235.240.0/20"

  # Faixas dos health checks e proxies dos Load Balancers do Google
  cidrs_health_check = ["130.211.0.0/22", "35.191.0.0/16"]
}

# PostgreSQL: só aceita conexões vindas dos nós e Pods do GKE
resource "google_compute_firewall" "gke_para_postgres" {
  name      = "${var.prefixo}-allow-gke-postgres"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 1000

  source_ranges = [var.cidr_subnet_gke, var.cidr_pods]
  target_tags   = [local.tag_db]

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }
}

# SSH para a VM do banco apenas através do IAP (sem expor a porta 22 à internet)
resource "google_compute_firewall" "iap_ssh" {
  name      = "${var.prefixo}-allow-iap-ssh"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 1000

  source_ranges = [local.cidr_iap]
  target_tags   = [local.tag_db, local.tag_gke_nos]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# Health checks do Load Balancer (Ingress) até aos Pods/nós
resource "google_compute_firewall" "health_checks" {
  name      = "${var.prefixo}-allow-health-checks"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 1000

  source_ranges = local.cidrs_health_check
  target_tags   = [local.tag_gke_nos]

  allow {
    protocol = "tcp"
  }
}

resource "google_compute_firewall" "deny_all_ingress" {
  name      = "${var.prefixo}-deny-all-ingress"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 65534

  source_ranges = ["0.0.0.0/0"]

  deny {
    protocol = "all"
  }
}
