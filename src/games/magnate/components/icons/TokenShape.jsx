/** Dibujos propios de las 8 fichas (viewBox 24×24). */
const SHAPES = {
  crown: { fill: 'M3 18 L4.6 7.5 L9.2 11.6 L12 5 L14.8 11.6 L19.4 7.5 L21 18 Z M4 19.5 H20 V21 H4 Z' },
  rocket: {
    fill: 'M12 2 C15.5 5 16.6 9.5 15.4 15 H8.6 C7.4 9.5 8.5 5 12 2 Z M8.8 12 L5.5 17.5 L9 16.2 Z M15.2 12 L18.5 17.5 L15 16.2 Z M10 16.2 H14 L12 21.5 Z',
  },
  anchor: {
    stroke: 'M12 7.5 V21 M7.5 11 H16.5 M4.5 14.5 C5 18.5 8 21 12 21 C16 21 19 18.5 19.5 14.5',
    fill: 'M12 2.2 A2.6 2.6 0 1 1 12 7.4 A2.6 2.6 0 1 1 12 2.2 Z',
  },
  star: { fill: 'M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z' },
  diamond: { fill: 'M7 3 H17 L22 9 L12 22 L2 9 Z' },
  bolt: { fill: 'M13.5 2 L4 13.5 H11 L9.8 22 L20 9.8 H13 Z' },
  heart: { fill: 'M12 21 C5 15.5 2 12.2 2 8.4 A4.6 4.6 0 0 1 12 6.2 A4.6 4.6 0 0 1 22 8.4 C22 12.2 19 15.5 12 21 Z' },
  moon: { fill: 'M14.5 2.5 A9.5 9.5 0 1 0 21.5 15.5 A7.5 7.5 0 1 1 14.5 2.5 Z' },
};

export default function TokenShape({ tokenId, color = 'currentColor', size = '100%' }) {
  const shape = SHAPES[tokenId] ?? SHAPES.star;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {shape.fill && <path d={shape.fill} fill={color} />}
      {shape.stroke && <path d={shape.stroke} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />}
    </svg>
  );
}
