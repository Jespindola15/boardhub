import { useEffect, useMemo, useState } from 'react';
import GameBar from '../../platform/components/GameBar.jsx';
import Button from '../Button.jsx';
import useLocalGame from '../useLocalGame.js';
import { PALETTE, paletteHex } from '../playerPalette.js';
import { createRoom } from '../../net/useRoom.js';
import { lastName } from '../../net/session.js';
import { navigate } from '../../app/router.js';
import { VisibilityToggle } from '../../platform/pages/RoomsPage.jsx';
import './kit.css';

/**
 * Pantalla común de los juegos de BoardHub: menú (online / esta PC), configuración local
 * y partida local por turnos con "pantalla para pasar la PC".
 *
 * engine: { setup, applyAction, getPlayerView, getPendingDeciders, definition }
 * Table:  ({ view, send, onNextRound, local }) — la misma mesa que usa la sala online.
 * Options: ({ options, onChange, disabled }) opcional.
 * checkPlayers(n, options) → mensaje de error o null (p. ej. Truco: 2, 4 o 6).
 * privateInfo: si hay información oculta, se muestra la cortina entre jugadores.
 */
export default function GameShell({ manifest, slug, accent, logo, intro, engine, Table, Rules, Options, defaultOptions = {}, checkPlayers, privateInfo = true, minPlayers, maxPlayers }) {
  const min = minPlayers ?? engine.definition.players.min;
  const max = maxPlayers ?? engine.definition.players.max;
  const getActing = (s) => engine.getPendingDeciders(s)[0] ?? null;
  const local = useLocalGame({
    storageKey: `boardhub.${slug}.local.v1`,
    applyAction: engine.applyAction,
    getActingPlayerId: getActing,
    create: ({ players, options }) => engine.setup({ id: `local-${Date.now()}`, players, options }),
  });
  const [mode, setMode] = useState(local.state ? 'local' : 'menu');
  const [rules, setRules] = useState(false);

  useEffect(() => {
    document.title = `${manifest?.name ?? logo} · BoardHub`;
  }, [manifest, logo]);

  return (
    <div className="kit">
      <GameBar
        title={manifest?.name ?? logo}
        accent={accent}
        badge={mode === 'local' ? 'Partida local · misma PC' : null}
        onlineSlug={slug}
        inGame={mode === 'local' && Boolean(local.state)}
        onQuit={() => {
          local.quit();
          setMode('menu');
        }}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setRules(true)}>
            Reglamento
          </Button>
        }
      />
      {mode === 'menu' && <StartMenu basedOn={manifest?.basedOn} slug={slug} logo={logo} accent={accent} intro={intro} Options={Options} defaultOptions={defaultOptions} onLocal={() => setMode('local')} />}
      {mode === 'local' && !local.state && (
        <LocalSetup logo={logo} accent={accent} min={min} max={max} Options={Options} defaultOptions={defaultOptions} checkPlayers={checkPlayers} onStart={local.start} onBack={() => setMode('menu')} />
      )}
      {mode === 'local' && local.state && <LocalTable engine={engine} state={local.state} send={local.send} Table={Table} privateInfo={privateInfo} onNewGame={local.quit} />}
      {rules && <Rules onClose={() => setRules(false)} />}
      {local.error && (
        <div className="bh-toast" role="alert" key={local.error}>
          {local.error}
        </div>
      )}
    </div>
  );
}

function StartMenu({ basedOn, slug, logo, accent, intro, Options, defaultOptions, onLocal }) {
  const [name, setName] = useState(lastName());
  const [options, setOptions] = useState(defaultOptions);
  const [visibility, setVisibility] = useState('public');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const r = await createRoom({ gameId: slug, name, options, visibility });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    navigate(`/sala/${r.code}`);
  };

  return (
    <div className="kit-setup cafe-stage">
      <div className="kit-card">
        <span className="kit-logo" style={{ '--accent': accent }}>
          {logo}
        </span>
        {basedOn && <p className="cafe-menu-origin">{basedOn}</p>}
        {intro && <p>{intro}</p>}
        <section className="kit-block">
          <h3>Abrir una mesa en línea</h3>
          <input className="kit-input" placeholder="Tu nombre" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
          <VisibilityToggle value={visibility} onChange={setVisibility} />
          {Options && <Options options={options} onChange={setOptions} />}
          <Button variant="primary" size="lg" disabled={!name.trim() || busy} onClick={create}>
            Abrir mesa {visibility === 'public' ? 'pública' : 'privada'}
          </Button>
        </section>
        <section className="kit-block">
          <h3>Sentarse con un código</h3>
          <div className="kit-row">
            <input
              className="kit-input kit-input--code"
              placeholder="CÓDIGO"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && navigate(`/sala/${code}`)}
            />
            <Button disabled={code.length !== 6} onClick={() => navigate(`/sala/${code}`)}>
              Entrar
            </Button>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/salas?juego=${slug}`)}>
            Ver mesas abiertas
          </Button>
        </section>
        <Button variant="ghost" onClick={onLocal}>
          Jugar en esta compu, pasándola
        </Button>
        {error && <p className="kit-error">{error}</p>}
      </div>
    </div>
  );
}

function LocalSetup({ logo, accent, min, max, Options, defaultOptions, checkPlayers, onStart, onBack }) {
  const [names, setNames] = useState(() => Array.from({ length: Math.max(min, Math.min(max, 3)) }, (_, i) => `Jugador ${i + 1}`));
  const [options, setOptions] = useState(defaultOptions);
  const clean = names.map((n) => n.trim());
  const dupes = !(clean.every(Boolean) && new Set(clean.map((n) => n.toLowerCase())).size === clean.length);
  const countError = checkPlayers?.(names.length, options) ?? null;

  return (
    <div className="kit-setup cafe-stage">
      <div className="kit-card">
        <span className="kit-logo" style={{ '--accent': accent }}>
          {logo}
        </span>
        <h2>Partida en esta PC</h2>
        <p>Al cambiar de jugador aparece una pantalla para pasar la PC sin que nadie vea lo ajeno.</p>
        <ol className="kit-names">
          {names.map((n, i) => (
            <li key={i}>
              <span className="kit-avatar" style={{ background: PALETTE[i].hex }}>
                {(n.trim()[0] ?? '?').toUpperCase()}
              </span>
              <input value={n} maxLength={16} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" disabled={names.length <= min} onClick={() => setNames(names.filter((_, j) => j !== i))} aria-label="Quitar">
                ✕
              </button>
            </li>
          ))}
        </ol>
        <Button disabled={names.length >= max} onClick={() => setNames([...names, `Jugador ${names.length + 1}`])}>
          + Agregar jugador ({names.length}/{max})
        </Button>
        {Options && <Options options={options} onChange={setOptions} />}
        <div className="kit-row">
          <Button variant="ghost" onClick={onBack}>
            Volver
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={dupes || Boolean(countError)}
            onClick={() => onStart({ players: clean.map((name, i) => ({ id: `p${i + 1}`, name, colorId: PALETTE[i].id })), options })}
          >
            Empezar partida
          </Button>
        </div>
        {dupes && <p className="kit-error">Cada jugador necesita un nombre distinto.</p>}
        {countError && <p className="kit-error">{countError}</p>}
      </div>
    </div>
  );
}

/** Partida local: la vista es la de quien debe decidir; entre jugadores, una cortina. */
function LocalTable({ engine, state, send, Table, privateInfo, onNewGame }) {
  const deciders = engine.getPendingDeciders(state);
  const acting = deciders[0] ?? null;
  const [revealedFor, setRevealedFor] = useState(null);
  const multi = new Set(state.players.map((p) => p.id)).size > 1;
  const hidden = privateInfo && multi && acting && revealedFor !== acting;
  const view = useMemo(() => engine.getPlayerView(state, hidden ? null : acting ?? state.players[0].id), [engine, state, hidden, acting]);
  const actor = state.players.find((p) => p.id === acting);

  return (
    <div className="kit-local">
      <Table view={view} local send={(type, payload) => send(type, payload, acting ?? undefined)} onNextRound={onNewGame} nextRoundLabel="Nueva partida" />
      {hidden && actor && (
        <div className="kit-curtain">
          <div className="kit-curtain__box">
            <span className="kit-avatar kit-avatar--lg" style={{ background: paletteHex(actor.colorId) }}>
              {actor.name[0].toUpperCase()}
            </span>
            <h3>Le toca a {actor.name}</h3>
            <p>Pasa la PC a {actor.name}. Los demás, no miren.</p>
            <Button variant="primary" size="lg" onClick={() => setRevealedFor(acting)}>
              Soy {actor.name}: continuar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
