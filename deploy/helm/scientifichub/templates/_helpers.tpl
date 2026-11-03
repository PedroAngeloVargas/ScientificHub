{{/* Labels comuns a todos os recursos */}}
{{- define "scientifichub.labels" -}}
app.kubernetes.io/part-of: scientifichub
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/* Imagem completa de uma aplicação: <registro>/<nome>:<tag> */}}
{{- define "scientifichub.imagem" -}}
{{- $raiz := index . 0 -}}
{{- $nome := index . 1 -}}
{{- required "imagem.registro é obrigatório (ex: us-central1-docker.pkg.dev/<projeto>/scientifichub)" $raiz.Values.imagem.registro -}}/{{ $nome }}:{{ $raiz.Values.imagem.tag }}
{{- end }}

{{/* Com a tag "latest" a imagem tem de ser baixada sempre; com o hash do commit, só uma vez */}}
{{- define "scientifichub.pullPolicy" -}}
{{- if eq .Values.imagem.tag "latest" }}Always{{ else }}IfNotPresent{{ end }}
{{- end }}

{{/*
Variáveis do PostgreSQL. A senha vem do Secret e é interpolada na URL pelo Kubernetes ($(VAR)),
por isso tem de ser segura para URL (ex: gerada com "openssl rand -hex 24").
*/}}
{{- define "scientifichub.envPostgres" -}}
{{- $raiz := index . 0 -}}
{{- $schema := index . 1 -}}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ $raiz.Values.segredos.nome }}
      key: POSTGRES_PASSWORD
- name: DATABASE_URL
  value: "postgresql://{{ $raiz.Values.postgres.usuario }}:$(POSTGRES_PASSWORD)@{{ $raiz.Values.postgres.host }}:{{ $raiz.Values.postgres.porta }}/{{ $raiz.Values.postgres.banco }}?schema={{ $schema }}"
{{- end }}

{{/* Segurança dos containers: sem root, sem escalada de privilégios, sem capabilities */}}
{{- define "scientifichub.securityContext" -}}
allowPrivilegeEscalation: false
runAsNonRoot: true
capabilities:
  drop: ["ALL"]
seccompProfile:
  type: RuntimeDefault
{{- end }}
