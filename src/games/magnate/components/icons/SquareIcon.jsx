/** Iconografía propia de las casillas especiales (viewBox 24×24, trazo). */
const ICONS = {
  train: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 10 H19 M9 21 L10.5 17 M15 21 L13.5 17" />
      <circle cx="9" cy="13.5" r="0.9" fill="currentColor" />
      <circle cx="15" cy="13.5" r="0.9" fill="currentColor" />
    </>
  ),
  bolt: <path d="M13.5 2 L4.5 13.5 H11 L10 22 L19.5 10 H13 Z" />,
  drop: <path d="M12 2.5 C8 8 5.5 11.3 5.5 14.6 A6.5 6.5 0 0 0 18.5 14.6 C18.5 11.3 16 8 12 2.5 Z" />,
  tax: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 8.6 C14 7.6 13 7.2 12 7.2 C10.3 7.2 9.2 8.1 9.2 9.4 C9.2 12.4 14.8 11.2 14.8 14.4 C14.8 15.8 13.6 16.8 12 16.8 C10.8 16.8 9.8 16.3 9 15.3 M12 5.5 V7.2 M12 16.8 V18.5" />
    </>
  ),
  chance: (
    <>
      <path d="M8.5 8.6 C8.5 6.4 10.1 5 12.1 5 C14.2 5 15.7 6.4 15.7 8.3 C15.7 11.2 12.2 11.3 12.2 14.3" />
      <circle cx="12.2" cy="18.6" r="1.1" fill="currentColor" />
    </>
  ),
  chest: (
    <>
      <path d="M3.5 10 C3.5 6.5 6.5 5 12 5 C17.5 5 20.5 6.5 20.5 10 V19 H3.5 Z" />
      <path d="M3.5 11 H20.5 M10.5 11 V14 H13.5 V11" />
    </>
  ),
  go: <path d="M3 12 H19 M13 6 L19 12 L13 18" />,
  parking: (
    <>
      <path d="M6 20 V9 M18 20 V9 M4 12 H20 M5 9 C5 5.5 8 4 12 4 C16 4 19 5.5 19 9" />
      <path d="M4 16 H20" />
    </>
  ),
  police: (
    <>
      <path d="M12 3 L19 6 V11 C19 15.5 16 19 12 21 C8 19 5 15.5 5 11 V6 Z" />
      <path d="M9 11.5 L11.2 13.7 L15.2 9.5" />
    </>
  ),
};

export default function SquareIcon({ name, className = '', strokeWidth = 1.8 }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}

/** Icono por defecto según el tipo de casilla. */
export function iconForSquare(square) {
  switch (square.type) {
    case 'station':
      return 'train';
    case 'utility':
      return square.icon ?? 'bolt';
    case 'tax':
      return 'tax';
    case 'chance':
      return 'chance';
    case 'community':
      return 'chest';
    case 'go':
      return 'go';
    case 'free-parking':
      return 'parking';
    case 'go-to-jail':
      return 'police';
    default:
      return null;
  }
}
