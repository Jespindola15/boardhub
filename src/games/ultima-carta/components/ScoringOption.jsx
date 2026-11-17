/** Método de puntuación: los dos son oficiales en la edición 41001-0925. */
export default function ScoringOption({ value, onChange, disabled = false }) {
  return (
    <fieldset className="cm-scoring" disabled={disabled}>
      <legend>Puntuación (ambas oficiales)</legend>
      <label className={value === 'winner' ? 'is-on' : ''}>
        <input type="radio" name="scoring" checked={value === 'winner'} onChange={() => onChange('winner')} />
        <span>
          <strong>Principal</strong>
          <small>Quien se queda sin cartas suma los puntos de los rivales. Gana el primero en llegar a 500.</small>
        </span>
      </label>
      <label className={value === 'low' ? 'is-on' : ''}>
        <input type="radio" name="scoring" checked={value === 'low'} onChange={() => onChange('low')} />
        <span>
          <strong>Puntos en contra</strong>
          <small>Cada uno suma lo que le queda en la mano. Cuando alguien llega a 500, gana el que menos tiene.</small>
        </span>
      </label>
    </fieldset>
  );
}
