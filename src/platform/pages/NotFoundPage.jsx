import Logo from '../components/Logo.jsx';
import Button from '../../shared/Button.jsx';
import { navigate } from '../../app/router.js';
import '../components/platform.css';

export default function NotFoundPage() {
  return (
    <div className="state-page">
      <Logo size={40} />
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a ninguna sección de BoardHub.</p>
      <Button variant="primary" onClick={() => navigate('/')}>Ir al inicio</Button>
    </div>
  );
}
