import { makeRules } from '../../../shared/kit/RulesModal.jsx';

export default makeRules({
  title: 'Reglamento de Rutas',
  source: 'Reglas del clásico juego de vagones y destinos (edición básica) sobre un mapa propio de Sudamérica. Detalle en docs/reglas/rutas/ESPECIFICACION.md.',
  sections: [
    ['Material', '45 vagones por jugador. 110 cartas de vagón: 12 de cada uno de los 8 colores y 14 locomotoras (comodines). Destinos con su valor.'],
    ['Preparación', 'Cada uno recibe 4 cartas de vagón y 3 destinos, de los que se queda al menos 2. Hay 5 cartas de vagón boca arriba.'],
    ['En tu turno, una sola de estas cosas', ['Robar 2 cartas de vagón: de las visibles o del mazo. Si tomás una locomotora visible, es tu única carta del turno; como segunda carta no podés tomar una locomotora visible.', 'Ocupar un tramo: pagá tantas cartas del mismo color como su largo (los tramos grises, de cualquier color; las locomotoras sirven de cualquier color) y poné tus vagones.', 'Robar 3 destinos y quedarte con al menos 1.']],
    ['Cartas visibles', 'Si quedan 3 locomotoras boca arriba, se descartan las 5 y se reponen.'],
    ['Rutas dobles', 'Un jugador no puede ocupar los dos tramos de una ruta doble. Con 2 o 3 jugadores sólo se puede usar uno de los dos.'],
    ['Puntos por tramo', 'Largo 1: 1 · 2: 2 · 3: 4 · 4: 7 · 5: 10 · 6: 15.'],
    ['Final', ['Cuando a alguien le quedan 2 vagones o menos al terminar su turno, cada jugador (incluido él) juega un último turno.', 'Destinos completados suman su valor; los no completados restan. El camino continuo más largo suma 10 (en caso de empate, a todos).', 'Gana quien tiene más puntos; si empatan, quien completó más destinos; luego, quien tiene el camino más largo.']],
  ],
});
