/** Opciones de la sala de Truco. */
export default function TrucoOptions({ options, onChange, disabled }) {
  const o = { target: 30, flor: false, picaPica: true, ...options };
  return (
    <fieldset className="kit-options" disabled={disabled}>
      <label>
        Partida a
        <select value={o.target} onChange={(e) => onChange({ ...o, target: Number(e.target.value) })}>
          <option value={30}>30 puntos (malas y buenas)</option>
          <option value={15}>15 puntos</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={o.flor} onChange={(e) => onChange({ ...o, flor: e.target.checked })} /> Jugar con flor
      </label>
      <label>
        <input type="checkbox" checked={o.picaPica} onChange={(e) => onChange({ ...o, picaPica: e.target.checked })} /> Pica-pica con 6 jugadores (a 30)
      </label>
      <small>Equipos alternados por orden de llegada. Se juega de a 2, 4 o 6.</small>
    </fieldset>
  );
}
