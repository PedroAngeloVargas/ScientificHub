// O match-service guarda as áreas em maiúsculas (ex: "REDES DE COMPUTADORES").
// Na interface mostramos em caixa de frase, preservando siglas conhecidas.
const SIGLAS = new Set(['IA', 'TI', 'ML', 'UX', 'UI', 'API', 'SQL', 'SRE', 'TCC', 'UEMG', 'ESG']);
// Siglas com grafia própria
const GRAFIAS: Record<string, string> = { IOT: 'IoT', DEVOPS: 'DevOps', GITHUB: 'GitHub' };

export function formatarArea(area: string) {
  const especial = (p: string) => {
    const nucleo = p.replace(/[^\p{L}]/gu, '').toUpperCase(); // ignora parênteses e pontuação: "(IOT)" -> "IOT"
    if (GRAFIAS[nucleo]) return p.toUpperCase().replace(nucleo, GRAFIAS[nucleo]);
    if (SIGLAS.has(nucleo)) return p.toUpperCase();
    return null;
  };
  const palavras = area.trim().split(/\s+/).map(p => especial(p) ?? p.toLowerCase());
  const frase = palavras.join(' ');
  return especial(palavras[0] ?? '') ? frase : frase.charAt(0).toUpperCase() + frase.slice(1);
}
