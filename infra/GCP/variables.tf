# ---------- Projeto ----------

variable "projeto_id" {
  description = "ID do projeto GCP onde a infraestrutura será criada."
  type        = string
}

variable "regiao" {
  description = "Região GCP. us-central1 é das mais baratas e entra no free tier da e2-micro; southamerica-east1 (São Paulo) tem menor latência, mas custa mais."
  type        = string
  default     = "us-central1"
}

variable "zona" {
  description = "Zona do cluster GKE (zonal = sem custo de gestão do control plane no free tier) e da VM do banco."
  type        = string
  default     = "us-central1-a"
}

variable "prefixo" {
  description = "Prefixo usado no nome de todos os recursos."
  type        = string
  default     = "scientifichub"
}

# ---------- Rede ----------

variable "cidr_subnet_gke" {
  description = "Faixa primária da subnet do GKE (IPs dos nós)."
  type        = string
  default     = "10.10.0.0/24"
}

variable "cidr_pods" {
  description = "Faixa secundária para os Pods do GKE."
  type        = string
  default     = "10.20.0.0/16"
}

variable "cidr_services" {
  description = "Faixa secundária para os Services do GKE."
  type        = string
  default     = "10.30.0.0/20"
}

variable "cidr_subnet_db" {
  description = "Faixa da subnet privada da VM do PostgreSQL."
  type        = string
  default     = "10.40.0.0/28"
}

variable "cidr_control_plane" {
  description = "Faixa /28 reservada para o control plane do GKE (cluster privado)."
  type        = string
  default     = "172.16.0.0/28"
}

variable "redes_autorizadas_control_plane" {
  description = "CIDRs que podem acessar a API do Kubernetes (kubectl). Use o seu IP público, ex: [\"200.100.50.25/32\"]."
  type        = list(string)
}

# ---------- GKE ----------

variable "gke_tipo_maquina" {
  description = "Tipo de máquina dos nós. e2-medium (2 vCPU partilhadas / 4 GB) é o mínimo confortável para os 4 serviços + frontend + Neo4j."
  type        = string
  default     = "e2-medium"
}

variable "gke_nos_min" {
  description = "Número mínimo de nós (autoscaling)."
  type        = number
  default     = 1
}

variable "gke_nos_max" {
  description = "Número máximo de nós (autoscaling)."
  type        = number
  default     = 3
}

variable "gke_spot" {
  description = "Usa VMs Spot nos nós (60-90% mais baratas, mas podem ser interrompidas pelo GCP a qualquer momento)."
  type        = bool
  default     = true
}

variable "gke_disco_gb" {
  description = "Tamanho do disco de cada nó (GB)."
  type        = number
  default     = 30
}

variable "protecao_exclusao" {
  description = "Impede o terraform destroy de apagar o cluster. Deixe false durante o desenvolvimento do TCC."
  type        = bool
  default     = false
}

# ---------- Pipelines ----------

variable "repositorio_github" {
  description = "Repositório (dono/nome) autorizado a usar a conta de deploy via Workload Identity Federation."
  type        = string
  default     = "PedroAngeloVargas/ScientificHub"
}

# ---------- Uploads ----------

variable "bucket_uploads" {
  description = "Nome do bucket de uploads criado pelo bootstrap. Vazio = \"<projeto_id>-uploads\"."
  type        = string
  default     = ""
}

# ---------- VM do PostgreSQL ----------

variable "db_tipo_maquina" {
  description = "Tipo de máquina da VM do banco. e2-micro é gratuita (1 por conta) em us-central1/us-east1/us-west1."
  type        = string
  default     = "e2-micro"
}

variable "db_disco_gb" {
  description = "Disco de sistema da VM do banco (GB). Somado ao disco de dados (20 GB, criado pelo bootstrap) fica nos 30 GB pd-standard do free tier."
  type        = number
  default     = 10
}

variable "db_disco_dados" {
  description = "Nome do disco de dados do PostgreSQL criado pelo bootstrap. Vazio = \"<prefixo>-postgres-dados\"."
  type        = string
  default     = ""
}

variable "db_imagem" {
  description = "Imagem do sistema operacional da VM do banco."
  type        = string
  default     = "debian-cloud/debian-12"
}
