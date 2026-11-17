import { useEffect, useState } from 'react';
import SpanishCard from '../../../shared/spanish-deck/SpanishCard.jsx';
import Button from '../../../shared/Button.jsx';
import { Avatar, GameLog, Finished } from '../../../shared/kit/parts.jsx';
import { paletteHex } from '../../../shared/playerPalette.js';
import Fosforos from './Fosforos.jsx';
import '../truco.css';

const TRUCO = ['', 'Truco', 'Retruco', 'Vale cuatro'];
const ENVIDO = { envido: 'Envido', real: 'Real envido', falta: 'Falta envido' };
const TEAM_COLORS = ['#3fa9ff', '#ff6b6b'];

export default function TrucoTable({ view, send, onNextRound, nextRoundLabel = 'Volver' }) {
  const h = view.hand;
  const legal = view.legal ?? [];
  const has = (t) => legal.find((a) => a.type === t);
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [view.version]);

  const myTeam = view.myTeam;
  const teamLabel = (t) => (view.players.length === 2 ? view.teamNames[t] : myTeam == null ? view.teamNames[t] : t === myTeam ? 'Nosotros' : 'Ellos');
  const n = view.players.length;
  const meIdx = Math.max(0, view.players.findIndex((p) => p.id === view.me));
  const rel = (id) => (view.players.findIndex((p) => p.id === id) - meIdx + n) % n;
  const pos = (id, radius = 1) => {
    const k = rel(id);
    const a = ((90 - (k * 360) / n) * Math.PI) / 180;
    return { left: `${50 + Math.cos(a) * 42 * radius}%`, top: `${50 + Math.sin(a) * 38 * radius}%` };
  };

  const pending = h.pending;
  const caller = pending && view.players.find((p) => p.id === pending.callerId);
  const pendingText = pending
    ? pending.kind === 'truco'
      ? `¡${TRUCO[pending.level]}!`
      : pending.kind === 'envido'
        ? pending.calls.map((k) => ENVIDO[k]).join(' · ')
        : pending.stage === 'flor'
          ? '¡Flor!'
          : pending.stage === 'contraflor'
            ? '¡Contraflor!'
            : '¡Contraflor al resto!'
    : null;
  const iRespond = pending && pending.respondTeam === myTeam && h.participants.includes(view.me);
  const myTurn = h.turnId === view.me && view.phase === 'playing';
  const canPlay = has('PLAY');
  const trucoAct = has('TRUCO');
  const envidoAct = has('ENVIDO');

  // Cartas jugadas por jugador en cada baza (incluida la baza en curso).
  const playedBy = {};
  [...h.tricks.map((t) => t.plays), h.current].forEach((plays, b) => plays.forEach((x) => ((playedBy[x.playerId] ??= [])[b] = { ...x, winner: h.tricks[b]?.winnerId === x.playerId, parda: h.tricks[b] && h.tricks[b].winnerTeam === null })));

  return (
    <div className="tr-layout">
      <div className="tr-table">
        <div className="tr-felt">
          <div className="tr-center-info">
            {view.duel && <span className="tr-badge">Pica-pica</span>}
            <span>Ronda {view.round}</span>
            {h.truco.level > 0 && <span className="tr-badge tr-badge--truco">{TRUCO[h.truco.level]} querido</span>}
          </div>
          {view.players.map((p) => {
            const playing = h.participants.includes(p.id);
            const isTurn = h.turnId === p.id || (pending && pending.respondTeam === p.team && playing);
            return (
              <div key={p.id} className={`tr-seat ${isTurn ? 'is-turn' : ''} ${playing ? '' : 'is-idle'}`} style={{ ...pos(p.id), '--team': TEAM_COLORS[p.team] }}>
                <Avatar player={p} />
                <div className="tr-seat__info">
                  <strong>
                    {p.name}
                    {p.id === view.me ? ' (vos)' : ''}
                  </strong>
                  <span>
                    {h.manoId === p.id && <em className="tr-chip">Mano</em>}
                    {view.dealerId === p.id && <em className="tr-chip tr-chip--d">Da</em>}
                    {!playing && 'Espera su duelo'}
                  </span>
                </div>
                {playing && p.id !== view.me && (
                  <div className="tr-seat__backs">
                    {Array.from({ length: h.remaining[p.id] }, (_, i) => (
                      <SpanishCard key={i} back size="sm" />
                    ))}
                  </div>
                )}
                {caller?.id === p.id && <div className="tr-bubble">{pendingText}</div>}
              </div>
            );
          })}
          {Object.entries(playedBy).map(([pid, cards]) => (
            <div key={pid} className="tr-played" style={pos(pid, 0.5)}>
              {cards.map((x, b) =>
                x ? (
                  <SpanishCard key={x.card.id} card={x.card} size="sm" className={`tr-played__card ${x.winner ? 'is-winner' : ''} ${x.parda ? 'is-parda' : ''}`} style={{ '--b': b }} />
                ) : null,
              )}
            </div>
          ))}
        </div>

        <div className="tr-me">
          {pending && (
            <div className={`tr-pending ${iRespond ? 'is-mine' : ''}`}>
              <strong>
                {caller?.name}: {pendingText}
              </strong>
              <span>{iRespond ? 'Te toca responder' : `Responde ${teamLabel(pending.respondTeam)}`}</span>
              {h.suspended && <small>El truco queda en espera: el envido está primero.</small>}
            </div>
          )}
          {!pending && view.phase === 'playing' && (
            <div className={`kit-turn ${myTurn ? 'is-mine' : ''}`}>{myTurn ? 'Te toca jugar' : `Juega ${view.players.find((p) => p.id === h.turnId)?.name ?? ''}…`}</div>
          )}
          <div className="tr-hand">
            {h.myCards.map((c) => (
              <SpanishCard
                key={c.id}
                card={c}
                size="lg"
                selected={selected === c.id}
                onClick={canPlay ? () => (selected === c.id ? send('PLAY', { cardId: c.id }) : setSelected(c.id)) : undefined}
                onDoubleClick={() => canPlay && send('PLAY', { cardId: c.id })}
              />
            ))}
            {h.participants.includes(view.me) && h.myCards.length === 0 && view.phase === 'playing' && <p className="kit-turn">Ya jugaste tus cartas.</p>}
            {!h.participants.includes(view.me) && view.me && <p className="kit-turn">Esperás tu duelo de pica-pica.</p>}
          </div>
          {h.myEnvido != null && (
            <div className="tr-tanto">
              Tenés <strong>{h.myEnvido}</strong> de envido{h.myFlor ? ' · ¡tenés flor!' : ''}
            </div>
          )}
          <div className="tr-actions">
            {canPlay && (
              <Button variant="primary" disabled={!selected} onClick={() => send('PLAY', { cardId: selected })}>
                Jugar carta
              </Button>
            )}
            {has('QUIERO') && (
              <Button variant="primary" onClick={() => send('QUIERO')}>
                ¡Quiero!
              </Button>
            )}
            {has('NO_QUIERO') && (
              <Button variant="danger" onClick={() => send('NO_QUIERO')}>
                No quiero
              </Button>
            )}
            {trucoAct && <Button onClick={() => send('TRUCO')}>{pending?.kind === 'truco' ? `Quiero ${TRUCO[trucoAct.level].toLowerCase()}` : TRUCO[trucoAct.level]}</Button>}
            {envidoAct?.kinds.map((k) => (
              <Button key={k} onClick={() => send('ENVIDO', { kind: k })}>
                {ENVIDO[k]}
              </Button>
            ))}
            {has('FLOR') && <Button onClick={() => send('FLOR')}>Flor</Button>}
            {has('CONTRAFLOR') && <Button onClick={() => send('CONTRAFLOR')}>Contraflor</Button>}
            {has('CONTRAFLOR_RESTO') && <Button onClick={() => send('CONTRAFLOR_RESTO')}>Contraflor al resto</Button>}
            {has('ACHICO') && <Button onClick={() => send('ACHICO')}>Con flor me achico</Button>}
            {has('MAZO') && (
              <Button variant="ghost" onClick={() => send('MAZO')}>
                Irse al mazo
              </Button>
            )}
          </div>
        </div>

        {view.phase === 'hand-over' && <HandOver view={view} send={send} teamLabel={teamLabel} />}
        {view.phase === 'finished' && (
          <Finished view={view} onNextRound={onNextRound} nextRoundLabel={nextRoundLabel}>
            <p>
              {teamLabel(0)} {view.scores[0]} — {view.scores[1]} {teamLabel(1)}
            </p>
          </Finished>
        )}
      </div>

      <aside className="tr-side">
        <section className="kit-panel tr-score">
          <h4>Tanteador · a {view.options.target}</h4>
          <div className="tr-score__cols">
            {[0, 1].map((t) => (
              <div key={t} className="tr-score__col">
                <strong style={{ color: TEAM_COLORS[t] }}>{teamLabel(t)}</strong>
                <span className="tr-score__n">{view.scores[t]}</span>
                <Fosforos points={view.scores[t]} target={view.options.target} />
              </div>
            ))}
          </div>
          {view.options.target === 30 && <small className="tr-score__note">Las primeras 15 son las malas; después, las buenas.</small>}
          {view.players.length > 2 && (
            <ul className="tr-teams">
              {[0, 1].map((t) => (
                <li key={t}>
                  <i style={{ background: TEAM_COLORS[t] }} />
                  {teamLabel(t)}:{' '}
                  {view.players
                    .filter((p) => p.team === t)
                    .map((p) => p.name)
                    .join(', ')}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="kit-panel tr-opts">
          <span>{view.options.flor ? 'Con flor' : 'Sin flor'}</span>
          {view.players.length === 6 && <span>{view.options.picaPica ? 'Pica-pica de 5 a 24' : 'Sin pica-pica'}</span>}
        </section>
        <GameLog lines={view.log} />
      </aside>
    </div>
  );
}

function HandOver({ view, send, teamLabel }) {
  const r = view.handResult;
  if (!r) return null;
  const how = { bazas: 'por las bazas', mazo: 'el rival se fue al mazo', 'no-quiero': 'no quisieron el truco' }[r.how] ?? '';
  return (
    <div className="kit-overlay">
      <div className="kit-overlay__box tr-handover">
        <h2>
          {teamLabel(r.winnerTeam)} {view.players.length === 2 ? 'gana' : 'ganan'} la mano
        </h2>
        <p>{how}</p>
        <div className="tr-handover__pts">
          {[0, 1].map((t) => (
            <span key={t} style={{ color: TEAM_COLORS[t] }}>
              {teamLabel(t)}: +{r.points[t]}
            </span>
          ))}
        </div>
        {r.envido && (
          <p className="tr-handover__envido">
            {r.envido.accepted ? `Envido: ${teamLabel(0)} ${r.envido.best[0]} · ${teamLabel(1)} ${r.envido.best[1]} → +${r.envido.points} ${teamLabel(r.envido.team)}` : `Envido no querido → +${r.envido.points} ${teamLabel(r.envido.team)}`}
          </p>
        )}
        {r.flor && (
          <p className="tr-handover__envido">
            Flor: +{r.flor.points} {teamLabel(r.flor.team)}
          </p>
        )}
        <p>
          Tanteador: {teamLabel(0)} {view.scores[0]} — {view.scores[1]} {teamLabel(1)}
        </p>
        {view.legal?.some((a) => a.type === 'NEXT_HAND') && (
          <Button variant="primary" size="lg" onClick={() => send('NEXT_HAND')}>
            {r.moreDuels ? 'Siguiente duelo' : 'Repartir de nuevo'}
          </Button>
        )}
      </div>
    </div>
  );
}
