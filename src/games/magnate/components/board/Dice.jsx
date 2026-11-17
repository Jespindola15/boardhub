const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Die({ value }) {
  const on = new Set(PIPS[value] ?? []);
  return (
    <span className="die" aria-label={value ? `Dado: ${value}` : 'Dado sin lanzar'}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`die__pip ${on.has(i) ? 'is-on' : ''}`} />
      ))}
    </span>
  );
}

export default function Dice({ values }) {
  const [a, b] = values ?? [null, null];
  return (
    <div className={`dice ${a === b && a ? 'is-double' : ''}`}>
      <Die value={a} />
      <Die value={b} />
    </div>
  );
}
