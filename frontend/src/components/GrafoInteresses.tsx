// Ilustração do login: pessoas (círculos azuis) ligadas às áreas que pesquisam.
// É o mesmo modelo que o match-service guarda no Neo4j. As linhas são "desenhadas a caneta" uma vez ao carregar.

const pessoas = [
  { id: 'a', x: 64, y: 118, iniciais: 'AN' },
  { id: 'b', x: 72, y: 318, iniciais: 'LU' },
  { id: 'c', x: 420, y: 112, iniciais: 'RC' },
  { id: 'd', x: 428, y: 300, iniciais: 'MT' },
];

// lado: onde fica o rótulo em relação ao nó (acima, para nenhuma linha o atravessar)
const areas = [
  { id: 'ia', x: 244, y: 64, nome: 'Inteligência artificial', lado: 'acima' },
  { id: 'grafos', x: 238, y: 214, nome: 'Grafos', lado: 'direita', comum: true },
  { id: 'edu', x: 164, y: 392, nome: 'Educação', lado: 'direita' },
  { id: 'saude', x: 330, y: 392, nome: 'Saúde pública', lado: 'direita' },
] as const;

// Cada ligação é uma curva suave (dx, dy desviam o ponto de controlo para parecer traço à mão)
const ligacoes = [
  { de: 'a', para: 'ia', dx: -6, dy: -16 },
  { de: 'a', para: 'grafos', dx: -12, dy: 20 },
  { de: 'c', para: 'ia', dx: 8, dy: -16 },
  { de: 'c', para: 'grafos', dx: 14, dy: 18 },
  { de: 'd', para: 'grafos', dx: 0, dy: 44 },
  { de: 'd', para: 'saude', dx: 20, dy: 18 },
  { de: 'b', para: 'edu', dx: -14, dy: 16 },
  { de: 'b', para: 'grafos', dx: 10, dy: 22 },
];

const ponto = (id: string) => pessoas.find(p => p.id === id) ?? areas.find(a => a.id === id)!;

export function GrafoInteresses() {
  return (
    <svg
      viewBox="0 0 480 420"
      className="h-auto w-full max-w-[480px] overflow-visible"
      role="img"
      aria-label="Quatro pessoas ligadas às áreas que pesquisam. Três delas partilham o interesse em Grafos."
    >
      {/* Ligações (tinta azul) */}
      {ligacoes.map((l, i) => {
        const a = ponto(l.de);
        const b = ponto(l.para);
        const cx = (a.x + b.x) / 2 + l.dx;
        const cy = (a.y + b.y) / 2 + l.dy;
        return (
          <path
            key={`${l.de}-${l.para}`}
            d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
            pathLength={1}
            fill="none"
            className="traco stroke-accent"
            strokeWidth={1.75}
            strokeLinecap="round"
            style={{ animationDelay: `${0.25 + i * 0.12}s` }}
          />
        );
      })}

      {/* Áreas de interesse; a área em comum recebe o marca-texto depois de as linhas chegarem */}
      {areas.map(area => {
        const acima = area.lado === 'acima';
        const tx = acima ? area.x : area.x + 14;
        const ty = acima ? area.y - 16 : area.y + 6;
        return (
          <g key={area.id}>
            {'comum' in area && (
              <rect
                x={tx - 3}
                y={ty - 6}
                width={area.nome.length * 9.4 + 6}
                height={11}
                className="no-grafo fill-highlight"
                style={{ animationDelay: '1.5s' }}
              />
            )}
            <circle cx={area.x} cy={area.y} r={6} className="fill-surface stroke-ink" strokeWidth={1.75} />
            <text
              x={tx}
              y={ty}
              textAnchor={acima ? 'middle' : 'start'}
              className="fill-ink"
              style={{ fontSize: 17, fontWeight: 'comum' in area ? 700 : 500 }}
            >
              {area.nome}
            </text>
          </g>
        );
      })}

      {/* Pessoas */}
      {pessoas.map((p, i) => (
        <g key={p.id} className="no-grafo" style={{ animationDelay: `${i * 0.06}s` }}>
          <circle cx={p.x} cy={p.y} r={21} className="fill-accent" />
          <text x={p.x} y={p.y + 5} textAnchor="middle" className="fill-white" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
            {p.iniciais}
          </text>
        </g>
      ))}
    </svg>
  );
}
