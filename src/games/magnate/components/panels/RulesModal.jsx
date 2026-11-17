import Modal from '../../../../shared/Modal.jsx';

/** Resumen del reglamento (edición Hasbro G0009; versión completa en docs/reglas/magnate/). */
export default function RulesModal({ onClose }) {
  return (
    <Modal title="Reglamento de Magnate" onClose={onClose} width={760}>
      <div className="rules">
        <section>
          <h4>Objetivo y preparación</h4>
          <ul>
            <li>Gana el último jugador que no quiebra. Cada uno empieza con $1.500.</li>
            <li>Empieza quien saca la tirada más alta (los empatados vuelven a tirar) y se sigue en orden.</li>
          </ul>
        </section>
        <section>
          <h4>Turno</h4>
          <ul>
            <li>Tira dos dados y avanza. Con dobles vuelves a tirar; con tres dobles seguidos vas a la cárcel sin mover.</li>
            <li>Al pasar o caer en la Salida cobras $200.</li>
            <li>Una propiedad libre se compra o se subasta.</li>
          </ul>
        </section>
        <section>
          <h4>Subastas</h4>
          <ul>
            <li>Participan todos, incluido quien no quiso comprar, y también quien está preso.</li>
            <li>Se empieza en $10 y se sube de a $1 o más, sin orden de turno.</li>
            <li>Termina cuando nadie quiere subir. Si nadie puja, la propiedad sigue en la banca.</li>
          </ul>
        </section>
        <section>
          <h4>Alquileres</h4>
          <ul>
            <li>Calles: con el grupo completo y sin edificar se cobra el doble (las hipotecadas no cobran).</li>
            <li>Estaciones: $25 / $50 / $100 / $200.</li>
            <li>Servicios: se tiran los dados de nuevo; 4× con uno, 10× con los dos.</li>
          </ul>
        </section>
        <section>
          <h4>Construir y vender (en cualquier momento)</h4>
          <ul>
            <li>Con el grupo completo y sin hipotecas en él, de forma pareja. Máximo 4 casas; luego un hotel.</li>
            <li>La banca tiene 32 casas y 12 hoteles. Si varios quieren los últimos, se subastan desde $10.</li>
            <li>Los edificios se venden a la banca por la mitad. Un hotel se cambia por 4 casas: si la banca no las tiene, no se puede vender.</li>
          </ul>
        </section>
        <section>
          <h4>Hipotecas y negociaciones (en cualquier momento)</h4>
          <ul>
            <li>Hipotecar exige vender antes los edificios del grupo y da la mitad del precio. Levantarla cuesta lo que indica la ficha.</li>
            <li>Cualquier jugador negocia dinero, propiedades sin edificios y cartas de libertad con cualquier otro.</li>
            <li>Una propiedad hipotecada se traspasa tal cual, sin recargo.</li>
          </ul>
        </section>
        <section>
          <h4>Cárcel</h4>
          <ul>
            <li>Para salir: pagar $50 antes de tirar, usar una carta (propia o comprada) o sacar dobles.</li>
            <li>Hay 3 intentos; al tercer fallo pagas $50 y avanzas con esa tirada.</li>
            <li>Preso puedes cobrar alquileres, pujar, construir, hipotecar y negociar.</li>
          </ul>
        </section>
        <section>
          <h4>Deudas y bancarrota</h4>
          <ul>
            <li>Si no puedes pagar, reúne el dinero vendiendo, hipotecando o negociando.</li>
            <li>Sólo quiebras si aun así no alcanza. Si debías a un jugador, recibe tu dinero, tus propiedades (hipotecadas) y tus cartas. Si debías a la banca, tus propiedades se subastan.</li>
          </ul>
        </section>
        <section>
          <h4>Adaptaciones digitales</h4>
          <ul>
            <li>El alquiler se cobra automáticamente.</li>
            <li>Abandonar la partida equivale a quebrar ante la banca.</li>
            <li>Se admiten hasta 8 jugadores (la caja indica 2–6).</li>
            <li>Regla de la casa opcional: pasar sin comprar ni subastar una propiedad libre.</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
