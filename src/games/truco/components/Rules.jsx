import { makeRules } from '../../../shared/kit/RulesModal.jsx';

export default makeRules({
  title: 'Reglamento de Truco argentino',
  source: 'Fuentes: trucoargentino.com.ar/reglas, truco.ar/reglas y trucoargento.com.ar/reglamento. Detalle en docs/reglas/truco/ESPECIFICACION.md.',
  sections: [
    ['Jugadores y cartas', '2, 4 o 6 jugadores en dos equipos (los compañeros se sientan alternados). Baraja española de 40 cartas (sin 8 ni 9). Tres cartas a cada uno. Se juega a 30 puntos (15 malas y 15 buenas) o a 15.'],
    ['Valor de las cartas', 'Ancho de espadas > ancho de bastos > 7 de espadas > 7 de oros > tres > dos > anchos falsos > doce > once > diez > sietes falsos > seis > cinco > cuatro.'],
    ['Bazas', ['Gana la mano quien gana dos de las tres bazas. Abre el mano; cada baza la abre quien ganó la anterior.', 'Parda (empate): si la primera es parda, define la segunda; si gana la primera y empata otra, gana quien ganó la primera; si las tres son pardas, gana el mano.']],
    ['Truco', 'Truco 2 puntos (1 si no se quiere), retruco 3 (2), vale cuatro 4 (3). Sólo puede subir el equipo que dijo "quiero". Una mano sin truco vale 1.'],
    ['Envido', ['Sólo en la primera baza, antes de jugar tu carta y antes de que se acepte el truco. En equipo lo abren los pies.', 'Tanto: dos cartas del mismo palo suman 20 más sus valores (figuras valen 0); si no, vale la carta más alta. Máximo 33. Empate: gana el mano.', 'Envido 2, envido-envido 4, real envido 3, envido + real 5, envido-envido-real 7. No querido: lo acumulado antes del último canto, o 1.', 'Falta envido: lo que le falta al que va ganando para llegar a 30; si ambos están en las malas, gana el partido.', '"El envido está primero": si te cantan truco en la primera baza, podés responder con envido; el truco espera.']],
    ['Irse al mazo', 'El rival suma lo que valga el truco en ese momento. Si te vas en la primera baza sin que se haya jugado el envido, suma además 1.'],
    ['Flor (opcional)', 'Tres cartas del mismo palo. Cantada vale 3 si el rival no tiene flor. Si tiene: "con flor me achico" (3), contraflor (querida 6, no querida 3) o contraflor al resto (querida: la falta; no querida 6). Anula el envido.'],
    ['Pica-pica (6 jugadores)', 'Mientras algún equipo tenga entre 5 y 24 puntos, se alterna una mano redonda con una de pica-pica: tres duelos 1 contra 1 entre rivales enfrentados. En los duelos la falta envido vale 6.'],
  ],
});
