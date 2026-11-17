/** Paleta de colores de jugador compartida por los juegos (hasta 10). */
export const PALETTE = [
  { id: 'violet', hex: '#8b6cff' },
  { id: 'teal', hex: '#22d3b6' },
  { id: 'amber', hex: '#ffae2b' },
  { id: 'rose', hex: '#ff4f86' },
  { id: 'sky', hex: '#3fa9ff' },
  { id: 'lime', hex: '#9be33a' },
  { id: 'coral', hex: '#ff7a45' },
  { id: 'snow', hex: '#e9ecf8' },
  { id: 'gold', hex: '#d4b24c' },
  { id: 'mint', hex: '#7be0b0' },
];
export const paletteHex = (id) => (PALETTE.find((c) => c.id === id) ?? PALETTE[0]).hex;
