import { makeRules } from '../../../shared/kit/RulesModal.jsx';

/** Resumen del reglamento. Completo en docs/reglas/chinchon/ESPECIFICACION.md. */
export default makeRules({
  title: 'Reglamento de Chinchón',
  source: 'Basado en el reglamento de Chin-Chon de los Juegos Bonaerenses. Baraja española de 48 cartas + 2 comodines.',
  sections: [
    ['Objetivo', 'No pasar de 101 puntos. Quien supera 101 queda afuera; gana el último que queda en juego.'],
    ['Reparto', 'Se dan 7 cartas a cada uno. Se da vuelta una carta para formar el pozo. Es mano el jugador a la derecha del que da; el que da rota en cada mano.'],
    ['Turno', 'Robás una carta (del mazo o la de arriba del pozo) y tirás una al pozo. Siempre terminás con 7 cartas. Los comodines no se tiran.'],
    ['Combinaciones', ['Grupo: 3 o 4 cartas del mismo número.', 'Escalera: 3 o más cartas seguidas del mismo palo. El As va antes del 2; no se da la vuelta (12-1 no vale).', 'El comodín reemplaza cualquier carta, como máximo uno por combinación. En la mano vale 20 puntos.']],
    ['Cortar', ['Después de robar podés cortar en vez de tirar: la carta del corte va tapada y lo que no combina no puede sumar más de 5 puntos.', 'Si cortás con todas las cartas combinadas, te restás 10.', 'Chin-Chon: las 7 cartas en una escalera del mismo palo. Con comodín resta 10; sin comodín gana el partido.']],
    ['Al cortar', 'Quien corta baja sus juegos primero. Los demás, en orden, bajan los suyos y pueden acomodar cartas sueltas en los juegos ya bajados (no se ponen comodines en juegos ajenos). Cada uno suma lo que le queda suelto.'],
    ['Mazo agotado', 'Si se acaba el mazo, se mezcla el pozo una vez. Si se acaba de nuevo, la mano termina sin corte y cada uno suma sus cartas sueltas, sin acomodar en juegos ajenos.'],
    ['En BoardHub', 'Las combinaciones y lo que se acomoda al final se calculan solos de la forma que menos puntos te deja. Podés ordenar tu mano arrastrando las cartas; ese orden sólo lo ves vos.'],
  ],
});
