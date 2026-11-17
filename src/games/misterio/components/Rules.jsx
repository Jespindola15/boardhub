import { makeRules } from '../../../shared/kit/RulesModal.jsx';

export default makeRules({
  title: 'Reglamento de Misterio',
  source: 'Reglas del clásico juego de deducción (quién, con qué y dónde). Personajes, armas y plano propios. Detalle en docs/reglas/misterio/ESPECIFICACION.md.',
  sections: [
    ['Objetivo', 'Descubrir las tres cartas del sobre: el personaje, el arma y la habitación del crimen.'],
    ['Preparación', 'Se separa al azar una carta de cada tipo en el sobre y el resto se reparte (algunos pueden tener una más). Cada jugador lleva un personaje; empieza la Condesa Carmín y se sigue en orden.'],
    ['Moverse', ['Tirá dos dados y movete hasta esa cantidad de casilleros, en horizontal o vertical, sin pasar por casilleros ocupados.', 'Entrar a una habitación por su puerta termina el movimiento. No podés volver a entrar en el mismo turno a la habitación de la que saliste.', 'Desde una esquina podés usar el pasaje secreto a la esquina opuesta en lugar de tirar.']],
    ['Sugerir', ['Al entrar a una habitación sugerís un personaje y un arma en esa habitación. Ambos se trasladan allí.', 'Empezando por el jugador siguiente, el primero que tenga alguna de esas cartas te muestra una (sólo a vos). Si tiene varias, elige cuál.', 'Si te trajeron a una habitación con una sugerencia, en tu turno podés quedarte y sugerir ahí.']],
    ['Acusar', 'En tu turno podés acusar: si acertás las tres cartas, ganás. Si te equivocás, quedás fuera de la investigación pero seguís mostrando cartas. Si queda un solo investigador, gana.'],
    ['Libreta', 'La libreta de la derecha es sólo tuya y queda guardada en este navegador. Las cartas que tenés o te mostraron se tachan solas.'],
  ],
});
