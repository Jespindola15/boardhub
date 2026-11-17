export default function DominioOptions({ options, onChange, disabled }) {
  const o = { quickSetup: false, ...options };
  return (
    <fieldset className="kit-options" disabled={disabled}>
      <label>
        <input type="checkbox" checked={o.quickSetup} onChange={(e) => onChange({ ...o, quickSetup: e.target.checked })} /> Colocación inicial automática (al azar)
      </label>
      <small>Por defecto cada jugador coloca sus ejércitos iniciales de a uno, como en el reglamento.</small>
    </fieldset>
  );
}
