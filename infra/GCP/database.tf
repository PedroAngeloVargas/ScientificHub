resource "google_compute_address" "db_interno" {
  name         = "${var.prefixo}-postgres-ip"
  region       = var.regiao
  subnetwork   = google_compute_subnetwork.db.id
  address_type = "INTERNAL"
  address      = cidrhost(var.cidr_subnet_db, 10)
}

# Disco de dados do PostgreSQL: criado pelo bootstrap/setup-pipeline.sh, fora deste Terraform,
# para que o "terraform destroy" (usado para poupar créditos) não apague o banco. A VM recriada volta a usá-lo.
data "google_compute_disk" "postgres_dados" {
  name = var.db_disco_dados != "" ? var.db_disco_dados : "${var.prefixo}-postgres-dados"
  zone = var.zona
}

resource "google_compute_instance" "postgres" {
  name         = "${var.prefixo}-postgres"
  zone         = var.zona
  machine_type = var.db_tipo_maquina

  tags = [local.tag_db]

  # Banco não deve ser interrompido como uma VM Spot
  scheduling {
    preemptible        = false
    provisioning_model = "STANDARD"
    automatic_restart  = true
  }

  # Disco de sistema: descartável, recriado junto com a VM
  boot_disk {
    initialize_params {
      image = var.db_imagem
      size  = var.db_disco_gb
      type  = "pd-standard"
    }
  }

  # Disco de dados (aparece na VM como /dev/disk/by-id/google-dados; monte-o em /var/lib/postgresql)
  attached_disk {
    source      = data.google_compute_disk.postgres_dados.self_link
    device_name = "dados"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.db.id
    network_ip = google_compute_address.db_interno.address
    # Sem bloco access_config = sem IP público
  }

  service_account {
    email  = google_service_account.db.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE" # Acesso SSH controlado pelo IAM do projeto
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  allow_stopping_for_update = true

  depends_on = [google_compute_router_nat.nat]
}

# Snapshot diário do disco de dados do banco (retém 7 dias)
resource "google_compute_resource_policy" "backup_db" {
  name   = "${var.prefixo}-postgres-backup"
  region = var.regiao

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "04:00"
      }
    }
    retention_policy {
      max_retention_days    = 7
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }
  }
}

resource "google_compute_disk_resource_policy_attachment" "backup_db" {
  name = google_compute_resource_policy.backup_db.name
  disk = data.google_compute_disk.postgres_dados.name
  zone = var.zona
}
