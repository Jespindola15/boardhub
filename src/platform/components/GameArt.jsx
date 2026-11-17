/**
 * Ilustraciones propias (SVG) para las tarjetas del catálogo.
 * Se mantienen como componentes simples para poder sustituirlas por arte final.
 */
export default function GameArt({ art }) {
  switch (art) {
    case 'magnate':
      return <MagnateArt />;
    case 'conquista':
      return <ConquistaArt />;
    case 'ludo':
      return <LudoArt />;
    case 'comodin':
      return <ComodinArt />;
    case 'colonos':
      return <ColonosArt />;
    default:
      return null;
  }
}

function MagnateArt() {
  const colors = ['#8b5a3c', '#7fd1f5', '#e05aa8', '#f59b3c', '#e8473f', '#f2d43a', '#2fae6a', '#3657d6'];
  return (
    <svg viewBox="0 0 320 180" className="game-art" aria-hidden="true">
      <defs>
        <linearGradient id="mg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1f57" />
          <stop offset="1" stopColor="#120f2b" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#mg-sky)" />
      {/* tablero en perspectiva */}
      <g transform="translate(160 118) scale(1 0.5) rotate(45)">
        <rect x="-70" y="-70" width="140" height="140" rx="6" fill="#e9e3cf" />
        <rect x="-50" y="-50" width="100" height="100" fill="#cfe5d3" />
        {colors.map((c, i) => (
          <rect key={c} x={-50 + (i % 4) * 25} y={i < 4 ? -70 : 50} width="25" height="8" fill={c} />
        ))}
      </g>
      {/* edificios */}
      {[
        [70, 40, 46, '#ffb547'],
        [96, 26, 70, '#7c5cff'],
        [214, 30, 58, '#2ee6c5'],
        [240, 22, 82, '#ff5c8a'],
      ].map(([x, w, h, c]) => (
        <g key={x}>
          <rect x={x} y={100 - h} width={w} height={h} rx="3" fill={c} opacity="0.9" />
          {Array.from({ length: Math.floor(h / 14) }).map((_, j) => (
            <rect key={j} x={x + 5} y={100 - h + 6 + j * 14} width={w - 10} height="5" rx="1" fill="#fff" opacity="0.35" />
          ))}
        </g>
      ))}
      <circle cx="160" cy="58" r="20" fill="#ffd36b" />
      <text x="160" y="65" textAnchor="middle" fontSize="20" fontWeight="800" fill="#7a4a00">$</text>
    </svg>
  );
}

function ConquistaArt() {
  return (
    <svg viewBox="0 0 320 180" className="game-art" aria-hidden="true">
      <rect width="320" height="180" fill="#1a1230" />
      <path d="M40 60 L95 40 L130 70 L110 115 L60 120 L35 95Z" fill="#ff5c8a" opacity="0.8" />
      <path d="M130 70 L190 50 L230 85 L200 130 L110 115Z" fill="#7c5cff" opacity="0.8" />
      <path d="M230 85 L280 60 L295 115 L250 145 L200 130Z" fill="#ffb547" opacity="0.8" />
      <path d="M60 120 L110 115 L200 130 L170 160 L80 158Z" fill="#2ee6c5" opacity="0.7" />
      {[[80, 85], [165, 92], [255, 105], [130, 140]].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill="#0e0b1d" stroke="#fff" strokeWidth="2" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{(x % 7) + 2}</text>
        </g>
      ))}
    </svg>
  );
}

function LudoArt() {
  const q = [
    ['#ff5c8a', 0, 0],
    ['#2ee6c5', 1, 0],
    ['#ffb547', 0, 1],
    ['#7c5cff', 1, 1],
  ];
  return (
    <svg viewBox="0 0 320 180" className="game-art" aria-hidden="true">
      <rect width="320" height="180" fill="#10202a" />
      <g transform="translate(95 15)">
        <rect width="150" height="150" rx="10" fill="#f1efe6" />
        {q.map(([c, x, y]) => (
          <g key={c}>
            <rect x={x * 90} y={y * 90} width="60" height="60" rx="8" fill={c} />
            <circle cx={x * 90 + 30} cy={y * 90 + 30} r="12" fill="#fff" />
          </g>
        ))}
        <polygon points="75,60 90,75 75,90 60,75" fill="#1d2245" />
      </g>
    </svg>
  );
}

function ComodinArt() {
  const cards = [
    ['#ef4444', '7', -22],
    ['#facc15', '+2', -8],
    ['#22c55e', '3', 6],
    ['#3b82f6', '9', 20],
  ];
  return (
    <svg viewBox="0 0 320 180" className="game-art" aria-hidden="true">
      <rect width="320" height="180" fill="#12301f" />
      <circle cx="160" cy="95" r="120" fill="#18402f" />
      {cards.map(([c, t, r]) => (
        <g key={c} transform={`translate(160 160) rotate(${r}) translate(-30 -118)`}>
          <rect width="60" height="88" rx="8" fill={c} stroke="#fff" strokeWidth="4" />
          <rect x="10" y="16" width="40" height="56" rx="14" fill="#fff" transform="rotate(-12 30 44)" />
          <text x="30" y="54" textAnchor="middle" fontSize="22" fontWeight="900" fill={c}>{t}</text>
        </g>
      ))}
    </svg>
  );
}

function ColonosArt() {
  const hex = (cx, cy, fill) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${cx + 26 * Math.cos(a)},${cy + 26 * Math.sin(a)}`;
    }).join(' ');
    return <polygon key={`${cx}-${cy}`} points={pts} fill={fill} stroke="#f3e7c3" strokeWidth="3" />;
  };
  const tiles = [
    [115, 52, '#2f8f4e'], [160, 52, '#d9b44a'], [205, 52, '#8d9aa5'],
    [92, 92, '#c8693d'], [137, 92, '#7cc36b'], [183, 92, '#2f8f4e'], [228, 92, '#d9b44a'],
    [115, 132, '#e8d9a0'], [160, 132, '#c8693d'], [205, 132, '#7cc36b'],
  ];
  return (
    <svg viewBox="0 0 320 180" className="game-art" aria-hidden="true">
      <rect width="320" height="180" fill="#1d4f7a" />
      {tiles.map(([x, y, f]) => hex(x, y, f))}
      <circle cx="160" cy="92" r="12" fill="#fff" />
      <text x="160" y="97" textAnchor="middle" fontSize="13" fontWeight="800" fill="#b91c1c">8</text>
    </svg>
  );
}
