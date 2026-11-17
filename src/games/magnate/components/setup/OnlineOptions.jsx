import './setup.css';

/** Opciones de Magnate en la sala online. */
export default function OnlineOptions({ options, onChange, disabled }) {
  return (
    <label className={`setup__option ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={Boolean(options.skipPurchase)}
        onChange={(e) => onChange({ ...options, skipPurchase: e.target.checked })}
      />
      <span>
        <strong>Permitir pasar sin comprar ni subastar</strong>
        <small>Regla de la casa. Sin marcar, se juega el reglamento oficial (comprar o subastar).</small>
      </span>
    </label>
  );
}
