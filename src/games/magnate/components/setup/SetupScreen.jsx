import { useState } from 'react';
import Button from '../../../../shared/Button.jsx';
import Token from '../board/Token.jsx';
import { PLAYER_COLORS, TOKENS, MIN_PLAYERS, MAX_PLAYERS, STARTING_MONEY } from '../../models/player.js';
import { formatMoney } from '../format.js';
import './setup.css';

const DEFAULT_NAMES = ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Jugador 5', 'Jugador 6', 'Jugador 7', 'Jugador 8'];

const makeSeat = (i) => ({ id: `p${i + 1}`, name: DEFAULT_NAMES[i], colorId: PLAYER_COLORS[i].id, tokenId: TOKENS[i].id });

/** Configuración de una partida local: 2–8 jugadores en la misma PC. */
export default function SetupScreen({ onStart }) {
  const [seats, setSeats] = useState(() => [0, 1, 2, 3].map(makeSeat));
  const [skipPurchase, setSkipPurchase] = useState(true);

  const update = (i, patch) => setSeats((s) => s.map((seat, j) => (j === i ? { ...seat, ...patch } : seat)));

  /** Cambia al siguiente valor libre (color o ficha) que no use otro jugador. */
  const cycle = (i, key, list) => {
    const used = new Set(seats.filter((_, j) => j !== i).map((s) => s[key]));
    const start = list.findIndex((x) => x.id === seats[i][key]);
    for (let n = 1; n <= list.length; n++) {
      const next = list[(start + n) % list.length];
      if (!used.has(next.id)) return update(i, { [key]: next.id });
    }
  };

  const add = () => {
    if (seats.length >= MAX_PLAYERS) return;
    const usedC = new Set(seats.map((s) => s.colorId));
    const usedT = new Set(seats.map((s) => s.tokenId));
    const ids = new Set(seats.map((s) => s.id));
    let n = 1;
    while (ids.has(`p${n}`)) n++;
    setSeats([
      ...seats,
      {
        id: `p${n}`,
        name: `Jugador ${seats.length + 1}`,
        colorId: PLAYER_COLORS.find((c) => !usedC.has(c.id)).id,
        tokenId: TOKENS.find((t) => !usedT.has(t.id)).id,
      },
    ]);
  };

  const names = seats.map((s) => s.name.trim());
  const valid = names.every(Boolean) && new Set(names.map((n) => n.toLowerCase())).size === names.length;

  return (
    <div className="setup">
      <div className="setup__card">
        <header className="setup__head">
          <span className="setup__logo">MAGNATE</span>
          <h2>Nueva partida local</h2>
          <p>
            Jueguen en esta misma PC pasándose el turno. Cada jugador empieza con {formatMoney(STARTING_MONEY)}. Se aplican
            las reglas clásicas completas.
          </p>
        </header>

        <ol className="setup__seats">
          {seats.map((seat, i) => (
            <li key={seat.id} className="seat">
              <span className="seat__n">{i + 1}</span>
              <button
                type="button"
                className="seat__token"
                onClick={() => cycle(i, 'tokenId', TOKENS)}
                title="Cambiar ficha"
              >
                <Token player={seat} />
              </button>
              <button
                type="button"
                className="seat__color"
                style={{ background: PLAYER_COLORS.find((c) => c.id === seat.colorId).hex }}
                onClick={() => cycle(i, 'colorId', PLAYER_COLORS)}
                title="Cambiar color"
                aria-label="Cambiar color"
              />
              <input
                className="seat__name"
                value={seat.name}
                maxLength={16}
                onChange={(e) => update(i, { name: e.target.value })}
                aria-label={`Nombre del jugador ${i + 1}`}
              />
              <button
                type="button"
                className="seat__remove"
                onClick={() => setSeats(seats.filter((_, j) => j !== i))}
                disabled={seats.length <= MIN_PLAYERS}
                title="Quitar jugador"
                aria-label="Quitar jugador"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>

        <label className="setup__option">
          <input type="checkbox" checked={skipPurchase} onChange={(e) => setSkipPurchase(e.target.checked)} />
          <span>
            <strong>Permitir pasar sin comprar ni subastar</strong>
            <small>
              Regla de la casa. El reglamento oficial obliga a comprar o subastar; con esta opción también se puede
              dejar la propiedad en la banca.
            </small>
          </span>
        </label>

        <div className="setup__foot">
          <Button onClick={add} disabled={seats.length >= MAX_PLAYERS}>
            + Agregar jugador ({seats.length}/{MAX_PLAYERS})
          </Button>
          <Button variant="primary" size="lg" disabled={!valid} onClick={() =>
              onStart({
                players: seats.map((s) => ({ ...s, name: s.name.trim(), isHost: s === seats[0] })),
                options: { skipPurchase },
              })
            }>
            Empezar partida
          </Button>
        </div>
        {!valid && <p className="setup__error">Cada jugador necesita un nombre distinto.</p>}
      </div>
    </div>
  );
}
