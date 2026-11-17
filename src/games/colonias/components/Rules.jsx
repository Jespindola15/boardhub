import { makeRules } from '../../../shared/kit/RulesModal.jsx';

export default makeRules({
  title: 'Reglamento de Colonias',
  source: 'Reglas del juego básico de colonos en una isla (3–4 jugadores). Detalle en docs/reglas/colonias/ESPECIFICACION.md.',
  sections: [
    ['Objetivo', 'Ser el primero en llegar a 10 puntos de victoria en tu turno. Poblado 1, ciudad 2, Gran Camino 2, Gran Ejército 2, cada carta de punto 1.'],
    ['Isla', '19 hexágonos: 4 bosques (madera), 4 pastos (lana), 4 campos (trigo), 3 cerros (ladrillo), 3 montañas (mineral) y un desierto donde empieza el ladrón. Los números 6 y 8 nunca quedan juntos. 9 puertos: 4 genéricos 3:1 y uno 2:1 de cada recurso.'],
    ['Preparación', 'En orden, cada uno pone un poblado y un camino junto a él; luego, en orden inverso, el segundo poblado y camino. El segundo poblado da un recurso por cada hexágono vecino.'],
    ['Turno', ['Tirá dos dados: cada hexágono con ese número produce para los poblados (1) y ciudades (2) de sus esquinas, salvo el que tiene al ladrón.', 'Después comerciá y construí en el orden que quieras, y terminá el turno.']],
    ['El 7', 'Nadie produce. Quien tenga más de 7 cartas descarta la mitad (redondeando hacia abajo). Luego movés el ladrón a otro hexágono y le robás una carta al azar a alguien con edificio allí.'],
    ['Construir', ['Camino: madera + ladrillo. Poblado: madera + ladrillo + lana + trigo. Ciudad (sobre un poblado): 2 trigo + 3 mineral. Carta de desarrollo: lana + trigo + mineral.', 'Regla de la distancia: ningún poblado en una esquina vecina a otro. Los poblados nuevos tienen que tocar un camino propio.', 'Límites: 15 caminos, 5 poblados, 4 ciudades.']],
    ['Comercio', 'Con otros jugadores (sólo en tu turno, lo que acuerden) o con el banco: 4:1, o 3:1 y 2:1 si tenés un poblado o ciudad en un puerto.'],
    ['Cartas de desarrollo', ['14 caballeros, 5 puntos, 2 construcción de caminos, 2 año de abundancia, 2 monopolio.', 'Una por turno, y no la que compraste en ese turno (los puntos no se juegan: cuentan solos). El caballero se puede jugar antes de tirar los dados.', 'Gran Ejército: el primero en jugar 3 caballeros; se pierde si otro juega más. Gran Camino: el primero con 5 caminos seguidos; se pierde si otro lo supera.']],
    ['En BoardHub', 'Las ofertas entre jugadores se hacen a un jugador por vez, que acepta o rechaza.'],
  ],
});
