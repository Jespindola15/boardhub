import './platform.css';

/** Marca de BoardHub: una ficha de latón y el nombre en Alegreya. */
export default function Logo({ size = 30, withText = true }) {
  const notches = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <span className={`cafe-logo ${size < 28 ? 'cafe-logo--sm' : ''}`}>
      <svg className="cafe-logo__chip" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#9e2f28" stroke="#4b120e" strokeWidth="1" />
        {notches.map((a) => (
          <rect key={a} x="14.2" y="1.2" width="3.6" height="5" rx="0.8" fill="#f3ead2" transform={`rotate(${a} 16 16)`} />
        ))}
        <circle cx="16" cy="16" r="9.2" fill="#c8a24a" stroke="#6f4e12" strokeWidth="0.8" />
        <path d="M11.5 17.5 L16 11 L20.5 17.5 L16 21 Z" fill="#2e1b0e" opacity="0.85" />
      </svg>
      {withText && <span className="cafe-logo__text">BoardHub</span>}
    </span>
  );
}
