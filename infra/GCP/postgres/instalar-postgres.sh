#!/usr/bin/env bash
# Instala e configura o PostgreSQL na VM privada (scientifichub-postgres). Executar a partir da sua máquina:
#
#   DB_SENHA="<mesma senha do secret POSTGRES_PASSWORD do GitHub>"
#   gcloud compute ssh scientifichub-postgres --zone us-central1-a --tunnel-through-iap \
#     --command "sudo DB_SENHA='$DB_SENHA' bash -s" < infra/GCP/postgres/instalar-postgres.sh
#
# Seguro para executar de novo: não formata um disco que já tem dados e reaproveita o banco existente
# (é o que acontece quando a VM é recriada depois de um "terraform destroy").
set -euo pipefail

SENHA="${DB_SENHA:?Defina DB_SENHA (a mesma do secret POSTGRES_PASSWORD do GitHub)}"
BANCO="scientifichub"
USUARIO="scientifichub"

DISCO="/dev/disk/by-id/google-dados"   # device_name "dados" no Terraform
PONTO="/var/lib/postgresql"

# Faixas que podem conectar: nós e pods do GKE (variables.tf: cidr_subnet_gke e cidr_pods)
REDES_GKE=("10.10.0.0/24" "10.20.0.0/16")

echo "==> 1/5 Disco de dados"
if ! blkid "$DISCO" >/dev/null 2>&1; then
  echo "    Disco vazio: formatando (ext4)"
  mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard "$DISCO"
else
  echo "    Disco já formatado: os dados existentes são mantidos"
fi
mkdir -p "$PONTO"
UUID="$(blkid -s UUID -o value "$DISCO")"
grep -q "$UUID" /etc/fstab || echo "UUID=$UUID $PONTO ext4 discard,defaults,nofail 0 2" >> /etc/fstab
mountpoint -q "$PONTO" || mount "$PONTO"

echo "==> 2/5 Instalando o PostgreSQL"
# Não deixa o pacote criar um cluster automaticamente: criamos (ou reaproveitamos) o nosso no passo 3
mkdir -p /etc/postgresql-common
echo "create_main_cluster = false" > /etc/postgresql-common/createcluster.conf
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q -o Dpkg::Options::=--force-confold postgresql

VERSAO="$(ls /usr/lib/postgresql | sort -V | tail -1)"
DADOS="$PONTO/$VERSAO/main"

echo "==> 3/5 Cluster $VERSAO/main"
chown postgres:postgres "$PONTO"
if [ ! -d "/etc/postgresql/$VERSAO/main" ]; then
  # Se $DADOS já tem um banco (VM recriada), o pg_createcluster integra-o em vez de criar outro
  mkdir -p "$PONTO/$VERSAO"
  chown postgres:postgres "$PONTO/$VERSAO"
  pg_createcluster "$VERSAO" main -d "$DADOS"
fi

echo "==> 4/5 Acesso pela rede do GKE"
CONF="/etc/postgresql/$VERSAO/main"
mkdir -p "$CONF/conf.d"
cat > "$CONF/conf.d/scientifichub.conf" <<EOF
# Escuta na rede privada; quem pode conectar é limitado pelo pg_hba.conf e pelo firewall da VPC
listen_addresses = '*'
password_encryption = 'scram-sha-256'
EOF
for rede in "${REDES_GKE[@]}"; do
  linha="host $BANCO $USUARIO $rede scram-sha-256"
  grep -qxF "$linha" "$CONF/pg_hba.conf" || echo "$linha" >> "$CONF/pg_hba.conf"
done
systemctl enable "postgresql@$VERSAO-main" >/dev/null
systemctl restart "postgresql@$VERSAO-main"

echo "==> 5/5 Usuário e banco"
sudo -u postgres psql -v ON_ERROR_STOP=1 -q -v usuario="$USUARIO" -v banco="$BANCO" -v senha="$SENHA" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'usuario')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'usuario') \gexec
ALTER ROLE :"usuario" WITH PASSWORD :'senha';
SELECT format('CREATE DATABASE %I OWNER %I', :'banco', :'usuario')
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'banco') \gexec
SQL

echo
echo "Pronto: PostgreSQL $VERSAO com o banco '$BANCO' (os schemas são criados pelo deploy, via prisma db push)."
