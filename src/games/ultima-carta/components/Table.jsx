import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../shared/Button.jsx';
import Panel from '../../../shared/Panel.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import Card from './Card.jsx';
import { COLORS, COLOR_HEX, COLOR_NAMES, isWild } from '../data/cards.js';
import { ACTIONS } from '../engine/index.js';

/**
 * Mesa de Última Carta. Dibuja una VISTA privada (getPlayerView) y envía intenciones.
 * La usan el modo online (vista del servidor) y el modo local (vista calculada aquí).
 *
 * props:
 *  view     vista del jugador que mira la pantalla
 *  send     (type, payload, asPlayerId?) => void
 *  hidden   oculta la mano (pantalla "pasa la PC" del modo local)
 *  onCatch  (targetId) => void   atrapar a quien no anunció
 *  footer   contenido extra (p. ej. botón de cortina en local)
 */
export default function Table({ view, send, hidden = false, onCatch, curtain = null, onNextRound, nextRoundLabel }) {
  const me = view.players.find((p) => p.id === view.me);
  const legal = view.legal ?? [];
  const can = (type) => legal.find((a) => a.type === type);
  const playable = new Set(can(ACTIONS.PLAY_CARD)?.cardIds ?? []);
  const [wildCard, setWildCard] = useState(null);
  const [announce, setAnnounce] = useState(false);

  useEffect(() => {
    setWildCard(null);
    setAnnounce(false);
  }, [view.version, view.me]);

  const play = (card, color) => {
    if (isWild(card) && !color) return setWildCard(card);
    send(ACTIONS.PLAY_CARD, { cardId: card.id, color, announce });
    setWildCard(null);
  };

  // Animaciones: reparto (cambio de mano) y cartas nuevas en la mano propia.
  const dealing = view.lastEvent?.type === 'deal';
  const prevIds = useRef(new Set());
  const newIds = useMemo(() => {
    const ids = new Set((me?.hand ?? []).map((c) => c.id).filter((id) => !prevIds.current.has(id)));
    return ids;
  }, [me?.hand]);
  useEffect(() => {
    prevIds.current = new Set((me?.hand ?? []).map((c) => c.id));
  }, [me?.hand]);

  const others = view.players.filter((p) => p.id !== view.me);
  const top = view.discardTop[view.discardTop.length - 1];
  const isMyTurn = view.currentPlayerId === view.me && !view.pendingDraw4;
  const catchable = view.vulnerableId && view.vulnerableId !== view.me && can(ACTIONS.CATCH);
  const name = (id) => view.players.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="cm-layout">
      <main className="cm-table">
        <div className="cm-seats">
          {others.map((p) => (
            <Seat
              key={p.id}
              player={p}
              isTurn={view.phase === 'playing' && view.deciders.includes(p.id)}
              isDealer={view.dealerId === p.id}
              vulnerable={view.vulnerableId === p.id}
              onCatch={catchable || onCatch ? () => (onCatch ? onCatch(p.id) : send(ACTIONS.CATCH, { targetId: p.id })) : null}
            />
          ))}
        </div>

        <div className="cm-center">
          <div className={`cm-dir ${view.direction === 1 ? 'is-cw' : 'is-ccw'}`} title={view.direction === 1 ? 'Sentido horario' : 'Sentido antihorario'}>
            {view.direction === 1 ? '↻' : '↺'}
          </div>
          <button
            type="button"
            className="cm-pile"
            onClick={() => send(ACTIONS.DRAW_CARD)}
            disabled={hidden || !can(ACTIONS.DRAW_CARD)}
            title="Robar una carta"
          >
            <Card back size="lg" />
            <span className="cm-pile__count">{view.drawCount}</span>
          </button>
          <div className="cm-discard">
            {view.discardTop.map((c, i, arr) => (
              <Card
                key={c.id}
                card={c}
                size="lg"
                className={i === arr.length - 1 ? 'is-landing' : ''}
                chosenColor={i === arr.length - 1 && isWild(c) ? view.currentColor : null}
                style={{ transform: `rotate(${(i - arr.length + 1) * 9 + (c.id.charCodeAt(c.id.length - 1) % 7) - 3}deg)`, zIndex: i }}
              />
            ))}
          </div>
          <div className="cm-color" style={{ '--c': COLOR_HEX[view.currentColor] ?? '#666' }}>
            <span className="cm-color__dot" />
            Color: <strong>{view.currentColor ? COLOR_NAMES[view.currentColor] : '—'}</strong>
          </div>
        </div>

        <div className="cm-status">
          {view.phase === 'finished' ? (
            <div className="cm-roundover">
              <h3>🏆 {view.winners.map(name).join(' y ')} {view.winners.length > 1 ? 'ganan' : 'gana'} la partida</h3>
              <p>
                {view.options.scoring === 'low' ? 'Gana quien tiene menos puntos.' : 'Primero en llegar a 500 puntos.'}
              </p>
              {onNextRound && (
                <Button variant="primary" size="lg" onClick={onNextRound}>
                  {nextRoundLabel ?? 'Nueva partida'}
                </Button>
              )}
            </div>
          ) : view.phase === 'round-over' ? (
            <div className="cm-roundover">
              <h3>
                {name(view.roundResult.winnerId)} gana la mano {view.round}
              </h3>
              <p>
                {view.options.scoring === 'winner'
                  ? `+${view.roundResult.points} puntos de las manos rivales.`
                  : 'Cada jugador suma los puntos de las cartas que le quedaron.'}
              </p>
              <Button variant="primary" size="lg" onClick={() => send(ACTIONS.NEXT_ROUND)}>
                Siguiente mano
              </Button>
            </div>
          ) : curtain ? (
            curtain
          ) : (
            <TurnBar view={view} send={send} can={can} me={me} name={name} isMyTurn={isMyTurn} announce={announce} setAnnounce={setAnnounce} />
          )}
        </div>

        {view.phase === 'playing' && me && (
          <div className={`cm-hand ${hidden ? 'cm-hand--hidden' : ''} ${dealing ? 'is-dealing' : ''}`} key={hidden ? 'h' : `r${view.round}`}>
            {me.hand.map((c, i) =>
              hidden ? (
                <Card key={c.id} back />
              ) : (
                <Card
                  key={c.id}
                  card={c}
                  playable={playable.has(c.id)}
                  dim={isMyTurn && !playable.has(c.id)}
                  className={newIds.has(c.id) && !dealing ? 'is-new' : ''}
                  style={dealing ? { animationDelay: `${i * 60}ms` } : undefined}
                  onClick={playable.has(c.id) ? () => play(c) : undefined}
                />
              ),
            )}
          </div>
        )}
      </main>

      <aside className="cm-side">
        <Panel title={`Puntos · ${view.options.scoring === 'low' ? 'gana el que menos tiene' : 'a 500'}`} className="cm-scores">
          <ol className="cm-score-list">
            {[...view.players]
              .sort((a, b) => (view.options.scoring === 'low' ? a.score - b.score : b.score - a.score))
              .map((p) => (
                <li key={p.id} className={p.left ? 'is-left' : ''}>
                  <span className="cm-avatar cm-avatar--sm" style={{ background: paletteHex(p.colorId) }}>
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="cm-score-name">
                    {p.name}
                    {p.id === view.me && <small> (tú)</small>}
                    {p.left && <small> · se fue</small>}
                  </span>
                  <strong>{p.score}</strong>
                </li>
              ))}
          </ol>
          <p className="cm-round">Mano {view.round}</p>
        </Panel>
        <Panel title="Registro" className="cm-log" bodyClassName="cm-log__body">
          <ol>
            {view.log.slice(-30).map((l) => (
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

      {view.reveal && !hidden && (
        <div className="cm-reveal">
          <div className="cm-reveal__box">
            <h4>Mano de {name(view.reveal.ofId)} (sólo la ves tú)</h4>
            <p>Color anterior: {COLOR_NAMES[view.reveal.previousColor]}</p>
            <div className="cm-reveal__cards">
              {view.reveal.cards.map((c) => (
                <Card key={c.id} card={c} size="sm" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Seat({ player, isTurn, isDealer, vulnerable, onCatch }) {
  const n = player.handCount;
  return (
    <div className={`cm-seat ${isTurn ? 'is-turn' : ''} ${player.left ? 'is-left' : ''}`} style={{ '--pc': paletteHex(player.colorId) }}>
      <span className="cm-avatar" style={{ background: paletteHex(player.colorId) }}>
        {player.name[0].toUpperCase()}
      </span>
      <div className="cm-seat__info">
        <strong>
          {player.name}
          {isDealer && <span className="cm-dealer" title="Reparte"> ◆</span>}
        </strong>
        <span>{player.left ? 'Abandonó' : `${n} ${n === 1 ? 'carta' : 'cartas'}`}</span>
      </div>
      <div className="cm-seat__fan">
        {Array.from({ length: Math.min(n, 10) }, (_, i) => (
          <Card key={i} back size="xs" style={{ marginLeft: i ? -12 : 0 }} />
        ))}
      </div>
      {vulnerable && onCatch && (
        <button type="button" className="cm-catch" onClick={onCatch} title="No anunció su última carta">
          ¡Atrapado!
        </button>
      )}
    </div>
  );
}

function TurnBar({ view, send, can, me, name, isMyTurn, announce, setAnnounce }) {
  if (view.awaitingColor) {
    return can(ACTIONS.CHOOSE_COLOR) ? (
      <div className="cm-turnbar">
        <span>La primera carta es un comodín: elige el color.</span>
        {COLORS.map((c) => (
          <button key={c} type="button" className="cm-swatch" style={{ background: COLOR_HEX[c] }} onClick={() => send(ACTIONS.CHOOSE_COLOR, { color: c })}>
            {COLOR_NAMES[c]}
          </button>
        ))}
      </div>
    ) : (
      <div className="cm-turnbar">{name(view.currentPlayerId)} está eligiendo el color…</div>
    );
  }
  if (view.pendingDraw4) {
    const from = name(view.pendingDraw4.fromId);
    return can(ACTIONS.CHALLENGE_DRAW4) ? (
      <div className="cm-turnbar">
        <span>
          {from} te jugó un <strong>Comodín Roba Cuatro</strong>. Si crees que tenía una carta del color anterior, desafíalo: si
          aciertas roba él 4; si no, robas 6.
        </span>
        <Button onClick={() => send(ACTIONS.ACCEPT_DRAW4)}>Robar 4</Button>
        <Button variant="danger" onClick={() => send(ACTIONS.CHALLENGE_DRAW4)}>
          Desafiar
        </Button>
      </div>
    ) : (
      <div className="cm-turnbar">
        {name(view.pendingDraw4.victimId)} decide si desafía el Roba Cuatro de {from}…
      </div>
    );
  }
  return (
    <div className="cm-turnbar">
      {isMyTurn ? (
        <span>
          <strong>Tu turno.</strong> Juega una carta {view.drawnCardId ? '(sólo la que robaste)' : 'o roba del mazo'}.
        </span>
      ) : (
        <span>Turno de {name(view.currentPlayerId)}…</span>
      )}
      {isMyTurn && me.hand.length === 2 && can(ACTIONS.PLAY_CARD) && (
        <button type="button" className={`cm-call ${announce ? 'is-on' : ''}`} onClick={() => setAnnounce(!announce)}>
          {announce ? '✓ Anunciaré «¡Última carta!»' : 'Anunciar «¡Última carta!» al jugar'}
        </button>
      )}
      {can(ACTIONS.CALL_LAST_CARD) && (
        <Button size="sm" variant="primary" onClick={() => send(ACTIONS.CALL_LAST_CARD)}>
          ¡Última carta!
        </Button>
      )}
      {can(ACTIONS.PASS) && <Button onClick={() => send(ACTIONS.PASS)}>Pasar</Button>}
      {can(ACTIONS.DRAW_CARD) && <Button onClick={() => send(ACTIONS.DRAW_CARD)}>Robar carta</Button>}
    </div>
  );
}
