import './platform.css';

/** Logo provisional de BoardHub: cuatro fichas de tablero + wordmark. */
export default function Logo({ size = 28, withText = true }) {
  return (
    <span className="bh-logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#14172b" />
        <rect x="6" y="6" width="9" height="9" rx="2" fill="#7c5cff" />
        <rect x="17" y="6" width="9" height="9" rx="2" fill="#2ee6c5" />
        <rect x="6" y="17" width="9" height="9" rx="2" fill="#ffb547" />
        <circle cx="21.5" cy="21.5" r="4.6" fill="#ff5c8a" />
      </svg>
      {withText && (
        <span className="bh-logo__text">
          Board<span>Hub</span>
        </span>
      )}
    </span>
  );
}
