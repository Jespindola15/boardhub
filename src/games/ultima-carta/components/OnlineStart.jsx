import { useState } from 'react';
import Button from '../../../shared/Button.jsx';
import ScoringOption from './ScoringOption.jsx';
import { createRoom } from '../../../net/useRoom.js';
import { lastName } from '../../../net/session.js';
import { navigate } from '../../../app/router.js';

/** Menú inicial: crear sala, unirse con código o jugar en esta PC. */
export default function OnlineStart({ onLocal }) {
  const [name, setName] = useState(lastName());
  const [scoring, setScoring] = useState('winner');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const r = await createRoom({ gameId: 'ultima-carta', name, options: { scoring } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    navigate(`/sala/${r.code}`);
  };

  return (
    <div className="cm-setup">
      <div className="cm-setup__card cm-start">
        <span className="cm-logo">ÚLTIMA CARTA</span>
        <p>Juego de descarte por colores para 2 a 8 jugadores, con las reglas oficiales de la edición clásica.</p>

        <section className="cm-start__block">
          <h3>Crear sala privada</h3>
          <input className="cm-input" placeholder="Tu nombre" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
          <ScoringOption value={scoring} onChange={setScoring} />
          <Button variant="primary" size="lg" disabled={!name.trim() || busy} onClick={create}>
            Crear sala
          </Button>
        </section>

        <section className="cm-start__block">
          <h3>Unirse con código</h3>
          <div className="cm-setup__row">
            <input
              className="cm-input cm-input--code"
              placeholder="CÓDIGO"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <Button disabled={code.length !== 6} onClick={() => navigate(`/sala/${code}`)}>
              Entrar
            </Button>
          </div>
        </section>

        <Button variant="ghost" onClick={onLocal}>
          Jugar en esta PC (sin conexión) →
        </Button>
        {error && <p className="cm-error">{error}</p>}
      </div>
    </div>
  );
}
