import Modal from '../../../shared/Modal.jsx';

/** Resumen del reglamento (Mattel 41001-0925). Completo en docs/reglas/ultima-carta/. */
export default function RulesModal({ onClose }) {
  return (
    <Modal title="Reglamento de Última Carta" onClose={onClose} width={760}>
      <div className="cm-rules">
        <p><strong>Objetivo:</strong> quedarte sin cartas. Por defecto, quien lo logra suma los puntos de las manos rivales (números: su valor; Salto, Reversa y Roba Dos: 20; comodines: 50) y gana el primero en llegar a 500. Con «puntos en contra», cada uno suma lo que le queda y, cuando alguien llega a 500, gana el que menos tiene.</p>
        <p><strong>Preparación:</strong> reparte quien saca la carta de más puntos. Se dan 7 cartas. Si la primera carta del descarte es un Roba Cuatro, vuelve al mazo; si es un Comodín, el primer jugador elige el color; si es una carta de acción, se aplica al empezar (con una Reversa empieza quien reparte).</p>
        <p><strong>Jugar:</strong> tira una carta del mismo color, número o símbolo, o un comodín. Una carta por turno. Puedes no jugar aunque puedas: entonces robas una y sólo puedes jugar esa.</p>
        <p><strong>Especiales:</strong> Salto (el siguiente pierde el turno), Reversa (cambia el sentido), Roba Dos (el siguiente roba 2 y pierde el turno), Comodín (eliges color), Comodín Roba Cuatro (eliges color y el siguiente roba 4 y pierde el turno). No se acumulan: quien recibe un Roba Dos o un Roba Cuatro roba sin poder responder.</p>
        <p><strong>Roba Cuatro:</strong> sólo es legal si no tienes cartas del color vigente. Quien debe robar puede desafiarte y ver tu mano: si era ilegal robas tú 4; si era legal, él roba 6.</p>
        <p><strong>«¡Última carta!»:</strong> anúncialo al jugar tu penúltima carta. Si no lo haces y otro jugador te atrapa antes de que el siguiente empiece su turno, robas 4.</p>
        <p><strong>Dos jugadores:</strong> Reversa y Salto te dejan volver a jugar; tras un Roba Dos o un Roba Cuatro, el rival roba y vuelves a jugar tú.</p>
      </div>
    </Modal>
  );
}
