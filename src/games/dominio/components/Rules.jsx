import { makeRules } from '../../../shared/kit/RulesModal.jsx';

export default makeRules({
  title: 'Reglamento de Dominio',
  source: 'Basado en el reglamento del juego clásico de conquista mundial (Hasbro), modalidad dominación mundial. Detalle en docs/reglas/dominio/ESPECIFICACION.md.',
  sections: [
    ['Objetivo', 'Conquistar los 42 territorios eliminando a todos los rivales.'],
    ['Preparación', ['Ejércitos iniciales: 3 jugadores 35, 4 jugadores 30, 5 jugadores 25, 6 jugadores 20. Los territorios se reparten al azar con un ejército cada uno.', 'Después, por turnos, cada uno pone un ejército por vez en sus territorios hasta colocar todos.', 'Dos jugadores: 40 cada uno y un ejército neutral de 40 que sólo defiende. Gana quien elimina al rival.']],
    ['Refuerzos', 'Al empezar el turno recibís territorios ÷ 3 (mínimo 3) más el bonus de cada continente completo: América del Norte 5, Europa 5, Asia 7, África 3, América del Sur 2, Oceanía 2.'],
    ['Cartas', ['Si conquistaste al menos un territorio en tu turno, recibís una carta al terminarlo.', 'Juegos: tres del mismo símbolo, uno de cada, o dos cualquiera más un comodín. Los canjes valen 4, 6, 8, 10, 12, 15 y luego 5 más cada vez.', 'Si una carta canjeada muestra un territorio tuyo, ponés 2 ejércitos extra ahí (una vez por turno). Con 5 o más cartas al empezar el turno tenés que canjear.']],
    ['Atacar', ['Desde un territorio con 2 o más ejércitos a uno vecino enemigo. El atacante tira hasta 3 dados (uno menos que sus ejércitos); el defensor hasta 2.', 'Se comparan los dados más altos de a pares: el más alto gana; los empates los gana el defensor.', 'Al conquistar hay que mover al menos tantos ejércitos como dados tiraste.']],
    ['Eliminar', 'Te quedás con las cartas del eliminado. Si así llegás a 6 o más, canjeás en el acto hasta quedar con 4 o menos y ponés esos ejércitos.'],
    ['Reagrupar', 'Al final del turno podés mover ejércitos una sola vez, de un territorio tuyo a otro vecino tuyo, dejando al menos uno.'],
    ['En BoardHub', 'El defensor tira siempre el máximo de dados que le permite su territorio. "Atacar hasta el final" repite el ataque con 3 dados hasta conquistar o quedarte con un ejército.'],
  ],
});
