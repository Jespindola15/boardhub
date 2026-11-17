import { makeRules } from '../../../shared/kit/RulesModal.jsx';

export default makeRules({
  title: 'Reglamento de Mazmorras y Traiciones',
  source: 'Reglas del clásico juego de saqueo de mazmorras (edición básica), con cartas, nombres y textos propios. Detalle en docs/reglas/mazmorras/ESPECIFICACION.md.',
  sections: [
    ['Objetivo', 'Llegar al nivel 10. El último nivel sólo se gana matando un monstruo.'],
    ['Preparación', 'Todos empiezan en nivel 1 con 4 cartas de puerta y 4 de tesoro. Podés jugar razas, clases y objetos en tu turno.'],
    ['Tu turno', ['1. Patear la puerta: se da vuelta una puerta. Si es un monstruo, peleás. Si es una maldición, te afecta. Si es otra cosa, va a tu mano.', '2. Si no hubo monstruo: buscá problemas (peleá con un monstruo de tu mano) o saqueá la habitación (robá una puerta boca abajo).', '3. Caridad: si terminás con más de 5 cartas (6 los enanos), donás el sobrante a quien tenga menos nivel; si sos vos, se descarta.']],
    ['Combate', ['Tu fuerza es tu nivel más tus objetos equipados. Ganás si superás al monstruo (los guerreros también ganan los empates).', 'Podés pedirle ayuda a un jugador ofreciéndole parte del tesoro. Los demás pueden meterse: potenciadores al monstruo, monstruos errantes, objetos de un uso.', 'Al ganar subís un nivel por monstruo (algunos dan 2) y robás sus tesoros.']],
    ['Huir', 'Si no podés ganar, huís: tirás un dado por monstruo y escapás con 5 o más (los elfos suman 1). Si no escapás, sufrís su desgracia: perder niveles, objetos, cartas… o morir.'],
    ['Morir', 'Perdés la mano y todo tu equipo, pero conservás nivel, raza y clase. En tu próximo turno recibís 4 + 4 cartas nuevas.'],
    ['Equipo', 'Un casco, una armadura, un calzado, dos manos de armas y un solo objeto grande (los enanos, todos los que quieran). Lo que no podés usar lo llevás sin bonus.'],
    ['Vender', 'En tu turno, objetos por 1000 de oro = 1 nivel (sin vuelto). Vendiendo no se llega al nivel 10. Los medianos venden un objeto al doble por turno.'],
    ['Razas y clases', ['Elfo: +1 para huir; sube un nivel al ayudar a ganar. Enano: objetos grandes sin límite y mano de 6. Mediano: vende uno al doble.', 'Guerrero: gana empates y furia (+1 por carta descartada, hasta 3). Mago: vuelo (+1 para huir por carta) y encantar. Ladrón: puñalada (−2 a quien pelea). Clérigo: exorcismo (+3 por carta contra muertos vivientes).']],
    ['En BoardHub', 'Cuando quien pelea dice que gana, los que tienen cartas para meterse deciden si interfieren o pasan. Si alguien interfiere, hay que volver a pelear.'],
  ],
});
