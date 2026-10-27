// Endereço dos ficheiros enviados (/uploads/...), entregues pelo academico-service.
// Localmente a API tem endereço absoluto (http://localhost:3002/api) e os ficheiros ficam na mesma origem.
// Em produção as APIs usam caminhos relativos no mesmo domínio (/api/...), então a base fica vazia.
const api = process.env.NEXT_PUBLIC_ACADEMICO_URL ?? '';
const base = /^https?:\/\//.test(api) ? new URL(api).origin : '';

export const urlArquivo = (caminho: string) => `${base}${caminho}`;
