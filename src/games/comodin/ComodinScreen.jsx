import { useEffect, useState } from 'react';
import GameBar from '../../platform/components/GameBar.jsx';
import Button from '../../shared/Button.jsx';
import Panel from '../../shared/Panel.jsx';
import Modal from '../../shared/Modal.jsx';
import useLocalGame from '../../shared/useLocalGame.js';
import { paletteHex } from '../../shared/playerPalette.js';
import Card from './components/Card.jsx';
import ComodinSetup from './components/ComodinSetup.jsx';
import { applyAction, getActingPlayerId, createGameState, ACTIONS, isPlayable } from './engine/index.js';
import { COLORS, COLOR_HEX, COLOR_NAMES } from './data/cards.js';
import './comodin.css';

const create = ({ players, targetScore }) => createGameState({ id: `local-${Date.now()}`, players, targetScore });

export default function ComodinScreen({ manifest }) {
  const { state, send, error, start, quit } = useLocalGame({
    storageKey: 'boardhub.comodin.local.v1',
    applyAction,
    getActingPlayerId,
    create,
  });
  const [rules, setRules] = useState(false);

  useEffect(() => {
    document.title = `${manifest?.name ?? 'Comodín'} · BoardHub`;
  }, [manifest]);

  return (
    <div className="cm">
      <GameBar
        title={manifest?.name ?? 'Comodín'}
        accent="#ef4444"
        inGame={Boolean(state)}
        onQuit={quit}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setRules(true)}>
            Reglamento
          </Button>
        }
      />
      {state ? <Table state={state} send={send} onNewGame={quit} /> : <ComodinSetup onStart={start} />}
      {rules && <RulesModal onClose={() => setRules(false)} />}
      {error && (
        <div className="cm-toast" role="alert" key={error}>
          {error}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Table({ state, send, onNewGame }) {
  const actingId = getActingPlayerId(state);
  const acting = state.players.find((p) => p.id === actingId);
  const [revealedFor, setRevealedFor] = useState(null);
  const [wildCard, setWildCard] = useState(null);
  const [callIt, setCallIt] = useState(false);
  const vulnerable = state.vulnerableId ? state.players.find((p) => p.id === state.vulnerableId) : null;

  useEffect(() => {
    setWildCard(null);
    setCallIt(false);
  }, [actingId, state.version]);

  const hidden = state.phase === 'playing' && revealedFor !== actingId;

  const play = (card, color) => {
    if (!card.color && !color) return setWildCard(card);
    send(ACTIONS.PLAY_CARD, { cardId: card.id, color, callComodin: callIt });
    setWildCard(null);
  };

  return (
    <div className="cm-layout">
      <main className="cm-table">
        <div className="cm-seats">
          {state.players.map((p) => (
            <Seat
              key={p.id}
              player={p}
              isTurn={state.phase === 'playing' && p.id === actingId}
              vulnerable={vulnerable?.id === p.id}
              onCatch={() => send(ACTIONS.CATCH, { targetId: p.id }, state.players.find((x) => x.id !== p.id).id)}
            />
          ))}
        </div>

        <div className="cm-center">
          <div className="cm-dir" data-dir={state.direction} title={state.direction === 1 ? 'Sentido horario' : 'Sentido antihorario'}>
            {state.direction === 1 ? '↻' : '↺'}
          </div>
          <button
            type="button"
            className="cm-pile"
            onClick={() => send(ACTIONS.DRAW_CARD)}
            disabled={hidden || state.phase !== 'playing' || Boolean(state.drawnCardId) || Boolean(state.pendingDraw4) || state.awaitingColor}
            title="Robar una carta"
          >
            <Card back size="lg" />
            <span className="cm-pile__count">{state.drawPile.length}</span>
          </button>
          <div className="cm-discard">
            {state.discard.slice(-3).map((c, i, arr) => (
              <Card
                key={c.id}
                card={c}
                size="lg"
                chosenColor={i === arr.length - 1 ? state.currentColor : null}
                style={{ transform: `rotate(${(i - arr.length + 1) * 9}deg)`, zIndex: i }}
              />
            ))}
          </div>
          <div className="cm-color" style={{ '--c': COLOR_HEX[state.currentColor] ?? '#666' }}>
            <span className="cm-color__dot" />
            Color: <strong>{state.currentColor ? COLOR_NAMES[state.currentColor] : '—'}</strong>
          </div>
        </div>

        <div className="cm-status">
          {state.phase === 'finished' ? (
            <RoundOver state={state} final onNext={onNewGame} />
          ) : state.phase === 'round-over' ? (
            <RoundOver state={state} onNext={() => send(ACTIONS.NEXT_ROUND)} />
          ) : hidden ? (
            <div className="cm-curtain">
              <span className="cm-avatar cm-avatar--lg" style={{ background: paletteHex(acting.colorId) }}>
                {acting.name[0].toUpperCase()}
              </span>
              <div>
                <h3>Turno de {acting.name}</h3>
                <p>Pasa la PC a {acting.name}. Los demás, no miren.</p>
              </div>
              <Button variant="primary" size="lg" onClick={() => setRevealedFor(actingId)}>
                Soy {acting.name}: ver mis cartas
              </Button>
            </div>
          ) : (
            <TurnBar state={state} acting={acting} send={send} callIt={callIt} setCallIt={setCallIt} />
          )}
        </div>

        {state.phase === 'playing' && !hidden && (
          <div className="cm-hand">
            {acting.hand.map((c) => {
              const ok = !state.awaitingColor && !state.pendingDraw4 && isPlayable(state, c) && (!state.drawnCardId || state.drawnCardId === c.id);
              return <Card key={c.id} card={c} playable={ok} dim={!ok} onClick={ok ? () => play(c) : undefined} />;
            })}
          </div>
        )}
        {state.phase === 'playing' && hidden && (
          <div className="cm-hand cm-hand--hidden">
            {acting.hand.map((c) => (
              <Card key={c.id} back />
            ))}
          </div>
        )}
      </main>

      <aside className="cm-side">
        <Panel title={`Puntos · partida a ${state.targetScore}`} className="cm-scores">
          <ol className="cm-score-list">
            {[...state.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <li key={p.id}>
                  <span className="cm-avatar cm-avatar--sm" style={{ background: paletteHex(p.colorId) }}>
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="cm-score-name">{p.name}</span>
                  <strong>{p.score}</strong>
                </li>
              ))}
          </ol>
          <p className="cm-round">Ronda {state.round}</p>
        </Panel>
        <Panel title="Registro" className="cm-log" bodyClassName="cm-log__body">
          <ol>
            {state.log.slice(-30).map((l) => (
              <li key={l.id}>{l.text}</li>
            ))}
          </ol>
        </Panel>
      </aside>

      {wildCard && (
        <div className="cm-picker" onMouseDown={(e) => e.target === e.currentTarget && setWildCard(null)}>
          <div className="cm-picker__box">
            <h3>Elige el color</h3>
            <div className="cm-picker__colors">
              {COLORS.map((c) => (
                <button key={c} type="button" style={{ background: COLOR_HEX[c] }} onClick={() => play(wildCard, c)}>
                  {COLOR_NAMES[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Seat({ player, isTurn, vulnerable, onCatch }) {
  const n = player.hand.length;
  return (
    <div className={`cm-seat ${isTurn ? 'is-turn' : ''}`} style={{ '--pc': paletteHex(player.colorId) }}>
      <span className="cm-avatar" style={{ background: paletteHex(player.colorId) }}>
        {player.name[0].toUpperCase()}
      </span>
      <div className="cm-seat__info">
        <strong>{player.name}</strong>
        <span>
          {n} {n === 1 ? 'carta' : 'cartas'} · {player.score} pts
        </span>
      </div>
      <div className="cm-seat__fan">
        {Array.from({ length: Math.min(n, 8) }, (_, i) => (
          <Card key={i} back size="xs" style={{ marginLeft: i ? -12 : 0 }} />
        ))}
      </div>
      {vulnerable && (
        <button type="button" className="cm-catch" onClick={onCatch} title="No cantó «¡Comodín!»">
          ¡Atrapado!
        </button>
      )}
    </div>
  );
}

function TurnBar({ state, acting, send, callIt, setCallIt }) {
  if (state.awaitingColor) {
    return (
      <div className="cm-turnbar">
        <span>La carta inicial es un comodín: {acting.name} elige el color.</span>
        {COLORS.map((c) => (
          <button key={c} type="button" className="cm-swatch" style={{ background: COLOR_HEX[c] }} onClick={() => send(ACTIONS.CHOOSE_COLOR, { color: c })}>
            {COLOR_NAMES[c]}
          </button>
        ))}
      </div>
    );
  }
  if (state.pendingDraw4) {
    const from = state.players.find((p) => p.id === state.pendingDraw4.fromId);
    return (
      <div className="cm-turnbar">
        <span>
          {from.name} jugó un <strong>Comodín Roba Cuatro</strong>. Si crees que tenía una carta del color anterior, desafíalo:
          si aciertas roba él 4; si te equivocas robas 6.
        </span>
        <Button onClick={() => send(ACTIONS.ACCEPT_DRAW4)}>Robar 4</Button>
        <Button variant="danger" onClick={() => send(ACTIONS.CHALLENGE_DRAW4)}>
          Desafiar
        </Button>
      </div>
    );
  }
  const vulnerableSelf = state.vulnerableId === acting.id;
  return (
    <div className="cm-turnbar">
      <span>
        <strong>{acting.name}</strong>, juega una carta {state.drawnCardId ? '(sólo la que robaste)' : 'o roba del mazo'}.
      </span>
      {acting.hand.length === 2 && (
        <label className={`cm-call ${callIt ? 'is-on' : ''}`}>
          <input type="checkbox" checked={callIt} onChange={(e) => setCallIt(e.target.checked)} />
          Cantar «¡Comodín!» al jugar
        </label>
      )}
      {vulnerableSelf && (
        <Button size="sm" variant="primary" onClick={() => send(ACTIONS.CALL_COMODIN)}>
          ¡Comodín!
        </Button>
      )}
      {state.drawnCardId ? (
        <Button onClick={() => send(ACTIONS.PASS)}>Pasar</Button>
      ) : (
        <Button onClick={() => send(ACTIONS.DRAW_CARD)}>Robar carta</Button>
      )}
    </div>
  );
}

function RoundOver({ state, final, onNext }) {
  const r = state.roundResult;
  const w = state.players.find((p) => p.id === (final ? state.winnerId : r?.winnerId));
  return (
    <div className="cm-roundover">
      <h3>{final ? `🏆 ¡${w.name} gana la partida!` : `${w.name} gana la ronda ${state.round}`}</h3>
      <p>
        +{r?.points ?? 0} puntos · total {w.score}
      </p>
      <Button variant="primary" size="lg" onClick={onNext}>
        {final ? 'Nueva partida' : 'Siguiente ronda'}
      </Button>
    </div>
  );
}

function RulesModal({ onClose }) {
  return (
    <Modal title="Reglamento de Comodín" onClose={onClose} width={720}>
      <div className="cm-rules">
        <p><strong>Objetivo:</strong> quedarte sin cartas. Quien gana la ronda suma los puntos de las cartas de los rivales (números: su valor; Salto, Reversa y Roba Dos: 20; comodines: 50). Gana quien llega primero al objetivo.</p>
        <p><strong>Jugar:</strong> tira una carta del mismo color, número o símbolo que la de arriba, o un comodín. Si no puedes o no quieres, roba una; si esa carta sirve, puedes jugarla en el acto.</p>
        <p><strong>Salto:</strong> el siguiente pierde el turno. <strong>Reversa:</strong> cambia el sentido (con 2 jugadores, funciona como salto). <strong>Roba Dos:</strong> el siguiente roba 2 y pierde el turno.</p>
        <p><strong>Comodín:</strong> eliges el color. <strong>Comodín Roba Cuatro:</strong> eliges el color y el siguiente roba 4 y pierde el turno. Sólo se puede jugar si no tienes cartas del color actual; el siguiente puede desafiarte: si hiciste trampa robas tú 4; si no, él roba 6.</p>
        <p><strong>¡Comodín!:</strong> al quedarte con una carta debes cantarlo. Si no lo haces y otro jugador te atrapa antes de que juegue el siguiente, robas 2.</p>
        <p><strong>Inicio:</strong> se reparten 7 cartas. Si la primera carta es un Roba Cuatro, se devuelve al mazo; si es una carta de acción, se aplica al primer jugador.</p>
      </div>
    </Modal>
  );
}
