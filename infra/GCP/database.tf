resource "google_compute_address" "db_interno" {
  name         = "${var.prefixo}-postgres-ip"
  region       = var.regiao
  subnetwork   = google_compute_subnetwork.db.id
  address_type = "INTERNAL"
  address      = cidrhost(var.cidr_subnet_db, 10)
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

  boot_disk {
    initialize_params {
      image = var.db_imagem
      size  = var.db_disco_gb
      type  = "pd-standard"
    }
    auto_delete = false # Mantém o disco (e os dados) se a VM for recriada por engano
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

# Snapshot diário do disco do banco (retém 7 dias)
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
  disk = google_compute_instance.postgres.name # O disco de boot herda o nome da VM
  zone = var.zona
}
