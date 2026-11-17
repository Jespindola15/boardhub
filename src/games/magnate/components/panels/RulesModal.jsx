import Modal from '../../../../shared/Modal.jsx';

/** Resumen del reglamento (versión completa en docs/REGLAMENTO_MAGNATE.md). */
export default function RulesModal({ onClose }) {
  return (
    <Modal title="Reglamento de Magnate" onClose={onClose} width={760}>
      <div className="rules">
        <section>
          <h4>Objetivo</h4>
          <p>Ser el último jugador que no quiebra. Cada jugador empieza con $1.500.</p>
        </section>
        <section>
          <h4>Turno</h4>
          <ul>
            <li>Tira dos dados y avanza. Si sacas dobles, vuelves a tirar; con tres dobles seguidos vas a la cárcel.</li>
            <li>Al pasar o caer en la Salida cobras $200.</li>
            <li>Si caes en una propiedad libre puedes comprarla. Si no la compras, se subasta entre todos, incluido tú.</li>
            <li>Si tiene dueño, pagas alquiler (salvo que esté hipotecada).</li>
          </ul>
        </section>
        <section>
          <h4>Alquileres</h4>
          <ul>
            <li>Propiedades: el alquiler se duplica si el dueño tiene todo el grupo sin edificar; con casas u hotel se usa la tabla.</li>
            <li>Estaciones: $25 / $50 / $100 / $200 según cuántas tenga el dueño.</li>
            <li>Servicios: 4 veces los dados con uno, 10 veces con los dos.</li>
          </ul>
        </section>
        <section>
          <h4>Construir</h4>
          <ul>
            <li>Necesitas el grupo completo y ninguna propiedad del grupo hipotecada.</li>
            <li>Construcción pareja: no puede haber más de una casa de diferencia dentro del grupo.</li>
            <li>Con 4 casas se construye un hotel. La banca tiene 32 casas y 12 hoteles.</li>
            <li>Los edificios se venden a la banca por la mitad de su precio.</li>
          </ul>
        </section>
        <section>
          <h4>Hipotecas y negociaciones</h4>
          <ul>
            <li>Hipotecar da la mitad del precio. Levantarla cuesta lo mismo más un 10 %.</li>
            <li>En tu turno puedes negociar propiedades sin edificios, dinero y cartas de libertad.</li>
            <li>Quien recibe una propiedad hipotecada paga el 10 % de interés en el acto.</li>
          </ul>
        </section>
        <section>
          <h4>Cárcel</h4>
          <ul>
            <li>Vas a la cárcel por la casilla «¡A la cárcel!», por una carta o por tres dobles.</li>
            <li>Para salir: paga $50, usa una carta de libertad o saca dobles (hasta 3 intentos; al tercero fallido pagas $50 y avanzas).</li>
            <li>Desde la cárcel sigues cobrando alquileres.</li>
          </ul>
        </section>
        <section>
          <h4>Deudas y bancarrota</h4>
          <ul>
            <li>Si no puedes pagar, vende edificios o hipoteca hasta reunir el dinero.</li>
            <li>Si aun así no alcanza, quiebras: si debías a otro jugador, él recibe todos tus bienes; si debías a la banca, tus propiedades se subastan.</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
