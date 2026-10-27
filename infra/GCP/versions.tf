terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Estado remoto no GCS (bucket criado pelo bootstrap/setup-pipeline.sh).
  # O bucket é informado no init, para não fixar o ID do projeto no código:
  #   terraform init -backend-config="bucket=<PROJETO>-tfstate"
  backend "gcs" {
    prefix = "scientifichub/infra"
  }
}

provider "google" {
  project = var.projeto_id
  region  = var.regiao
  zone    = var.zona
}
