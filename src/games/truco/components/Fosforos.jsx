/** Tanteador de fósforos: cuadrados de 5 (cuatro lados y la diagonal). Malas y buenas a 15. */
export default function Fosforos({ points, target }) {
  const half = target === 30 ? 15 : target;
  const groups = [];
  for (let g = 0; g < target / 5; g++) groups.push(Math.max(0, Math.min(5, points - g * 5)));
  return (
    <div className="tr-fos">
      {groups.map((n, g) => (
        <div key={g} className={`tr-fos__group ${g * 5 === half && target === 30 ? 'is-buenas' : ''}`}>
          <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
            <rect x="4" y="4" width="32" height="32" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="3" />
            {[
              [6, 4, 6, 36],
              [4, 34, 36, 34],
              [34, 36, 34, 4],
              [36, 6, 4, 6],
              [8, 8, 32, 32],
            ]
              .slice(0, n)
              .map(([x1, y1, x2, y2], i) => (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e8d3a2" strokeWidth="3" strokeLinecap="round" />
                  <circle cx={x1} cy={y1} r="2.6" fill="#d9452b" />
                </g>
              ))}
          </svg>
        </div>
      ))}
    </div>
  );
}
