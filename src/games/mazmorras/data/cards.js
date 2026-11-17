/**
 * Catálogo de cartas de Mazmorras y Traiciones. Nombres, textos y combinaciones propios,
 * con la misma estructura de mazos que el clásico de saqueo de mazmorras. Datos puros.
 *
 * Puertas: monstruos, maldiciones, razas, clases, potenciadores de monstruo, monstruos errantes.
 * Tesoros: equipo (con zona y bonus), objetos de un uso, "sube un nivel".
 */

/* ---------------- Puertas ---------------- */

/** [id, nombre, nivel, tesoros, desgracia, extra?] */
const MONSTERS = [
  ['babosa-burocratica', 'Babosa Burocrática', 1, 1, { type: 'cards', n: 2, text: 'Perdés 2 cartas de la mano.' }],
  ['rata-recaudadora', 'Rata Recaudadora', 1, 1, { type: 'level', n: 1, text: 'Perdés un nivel.' }],
  ['hongo-chismoso', 'Hongo Chismoso', 2, 1, { type: 'slot', slot: 'head', text: 'Perdés el casco.' }],
  ['gnomo-de-jardin-enojado', 'Gnomo de Jardín Enojado', 2, 1, { type: 'slot', slot: 'feet', text: 'Perdés el calzado.' }],
  ['pato-del-abismo', 'Pato del Abismo', 2, 1, { type: 'level', n: 1, text: 'Perdés un nivel.' }, { bonusVs: { elfo: 3 } }],
  ['esqueleto-contador', 'Esqueleto Contador', 3, 1, { type: 'cards', n: 3, text: 'Perdés 3 cartas de la mano.' }, { undead: true }],
  ['gelatina-pegajosa', 'Gelatina Pegajosa', 3, 1, { type: 'slot', slot: 'armor', text: 'Perdés la armadura.' }],
  ['mimico-de-placard', 'Mímico de Placard', 4, 2, { type: 'slot', slot: 'any', text: 'Perdés tu mejor objeto equipado.' }],
  ['trasgo-con-gripe', 'Trasgo con Gripe', 4, 2, { type: 'level', n: 1, text: 'Perdés un nivel.' }, { bonusVs: { enano: 2 } }],
  ['momia-sin-vendas', 'Momia sin Vendas', 5, 2, { type: 'level', n: 2, text: 'Perdés dos niveles.' }, { undead: true }],
  ['lobo-de-oficina', 'Lobo de Oficina', 5, 2, { type: 'slot', slot: 'hands', text: 'Perdés lo que llevás en las manos.' }],
  ['bruja-de-los-impuestos', 'Bruja de los Impuestos', 6, 2, { type: 'cards', n: 99, text: 'Perdés toda la mano.' }, { bonusVs: { mago: 3 } }],
  ['ogro-gourmet', 'Ogro Gourmet', 7, 2, { type: 'level', n: 2, text: 'Perdés dos niveles.' }],
  ['caballero-fantasma', 'Caballero Fantasma', 8, 2, { type: 'slot', slot: 'armor', text: 'Perdés la armadura.' }, { undead: true, bonusVs: { guerrero: 2 } }],
  ['minotauro-perdido', 'Minotauro Perdido', 8, 2, { type: 'level', n: 2, text: 'Perdés dos niveles.' }],
  ['quimera-indecisa', 'Quimera Indecisa', 10, 3, { type: 'slot', slot: 'any', text: 'Perdés tu mejor objeto equipado.' }],
  ['vampiro-vegano', 'Vampiro Vegano', 10, 3, { type: 'level', n: 3, text: 'Perdés tres niveles.' }, { undead: true, bonusVs: { clerigo: 3 } }],
  ['golem-de-papeles', 'Gólem de Papeles', 12, 3, { type: 'cards', n: 99, text: 'Perdés toda la mano y la armadura.', alsoSlot: 'armor' }],
  ['hidra-de-tres-quejas', 'Hidra de Tres Quejas', 12, 3, { type: 'level', n: 3, text: 'Perdés tres niveles.' }],
  ['liche-jubilado', 'Liche Jubilado', 14, 4, { type: 'death', text: 'Morís.' }, { undead: true }],
  ['dragon-de-la-deuda', 'Dragón de la Deuda', 16, 4, { type: 'death', text: 'Morís.' }],
  ['kraken-de-la-bañera', 'Kraken de la Bañera', 18, 4, { type: 'death', text: 'Morís.' }, { bonusVs: { enano: 4 } }],
  ['titan-del-tedio', 'Titán del Tedio', 20, 5, { type: 'death', text: 'Morís.' }, { levels: 2 }],
  ['murcielago-insomne', 'Murciélago Insomne', 1, 1, { type: 'slot', slot: 'head', text: 'Perdés el casco.' }],
  ['zombi-tardio', 'Zombi Tardío', 2, 1, { type: 'level', n: 1, text: 'Perdés un nivel.' }, { undead: true }],
  ['araña-tejedora-de-excusas', 'Araña Tejedora de Excusas', 6, 2, { type: 'slot', slot: 'feet', text: 'Perdés el calzado.' }],
  ['troll-del-foro', 'Troll del Foro', 9, 2, { type: 'cards', n: 99, text: 'Perdés toda la mano.' }],
  ['dragoncito-de-peluche', 'Dragoncito de Peluche', 4, 1, { type: 'level', n: 1, text: 'Perdés un nivel.' }],
];

const CURSES = [
  ['maldicion-pierde-nivel', 'Maldición: Tropezón Épico', { type: 'level', n: 1 }, 'Perdés un nivel.'],
  ['maldicion-pierde-nivel-2', 'Maldición: Mala Racha', { type: 'level', n: 1 }, 'Perdés un nivel.'],
  ['maldicion-casco', 'Maldición: Viento Travieso', { type: 'slot', slot: 'head' }, 'Perdés el casco.'],
  ['maldicion-armadura', 'Maldición: Óxido Instantáneo', { type: 'slot', slot: 'armor' }, 'Perdés la armadura.'],
  ['maldicion-calzado', 'Maldición: Cordones Malditos', { type: 'slot', slot: 'feet' }, 'Perdés el calzado.'],
  ['maldicion-raza', 'Maldición: Crisis de Identidad', { type: 'race' }, 'Perdés tu raza.'],
  ['maldicion-clase', 'Maldición: Despido Fulminante', { type: 'class' }, 'Perdés tu clase.'],
  ['maldicion-mano', 'Maldición: Bolsillo Agujereado', { type: 'cards', n: 2 }, 'Perdés 2 cartas de la mano al azar.'],
];

const RACES = ['elfo', 'enano', 'mediano'];
const CLASSES = ['guerrero', 'mago', 'ladron', 'clerigo'];
export const RACE_NAMES = { elfo: 'Elfo', enano: 'Enano', mediano: 'Mediano' };
export const CLASS_NAMES = { guerrero: 'Guerrero', mago: 'Mago', ladron: 'Ladrón', clerigo: 'Clérigo' };
export const POWERS = {
  elfo: '+1 para huir. Si ayudás a ganar un combate, subís un nivel.',
  enano: 'Podés llevar cualquier cantidad de objetos grandes. Mano máxima de 6 cartas.',
  mediano: 'Una vez por turno podés vender un objeto al doble de su precio.',
  guerrero: 'Ganás los empates. Furia: descartá hasta 3 cartas en combate, +1 cada una.',
  mago: 'Hechizo de vuelo: descartá hasta 3 cartas, +1 cada una para huir. Encantar: descartá tu mano (3+ cartas) para encantar a un monstruo solo: te llevás su tesoro, sin subir nivel.',
  ladron: 'Puñalada: descartá una carta para dar −2 a alguien en combate (una vez por víctima en cada combate).',
  clerigo: 'Exorcismo: descartá hasta 3 cartas, +3 cada una contra muertos vivientes.',
};

const ENHANCERS = [
  ['antiguo', 'Ancestral', 10, 2],
  ['enfurecido', 'Enfurecido', 5, 1],
  ['enfurecido-2', 'Muy Enojado', 5, 1],
  ['bebe', 'Versión Bebé', -5, -1],
  ['inteligente', 'Con Doctorado', 5, 1],
];

/* ---------------- Tesoros ---------------- */

/** [id, nombre, zona, bonus, oro, extra?] zona: head|armor|feet|hand1|hand2|big|none */
const ITEMS = [
  ['casco-de-olla', 'Casco de Olla', 'head', 1, 200],
  ['sombrero-con-pluma', 'Sombrero con Pluma Dramática', 'head', 2, 400],
  ['vincha-del-ninja-jubilado', 'Vincha del Ninja Jubilado', 'head', 3, 600, { only: 'ladron' }],
  ['mitra-luminosa', 'Mitra Luminosa', 'head', 3, 600, { only: 'clerigo' }],
  ['armadura-de-carton', 'Armadura de Cartón', 'armor', 1, 200],
  ['cota-de-anillos-de-cortina', 'Cota de Anillos de Cortina', 'armor', 2, 400],
  ['armadura-de-placas-ruidosa', 'Armadura de Placas Ruidosa', 'armor', 3, 600, { big: true }],
  ['tunica-estrellada', 'Túnica Estrellada', 'armor', 3, 500, { only: 'mago' }],
  ['pantuflas-veloces', 'Pantuflas Veloces', 'feet', 1, 300, { run: 1 }],
  ['botas-de-patear-puertas', 'Botas de Patear Puertas', 'feet', 2, 400],
  ['espada-de-plastico', 'Espada de Plástico', 'hand1', 1, 100],
  ['daga-del-ultimo-recurso', 'Daga del Último Recurso', 'hand1', 2, 300, { only: 'ladron' }],
  ['maza-de-madera', 'Maza de Madera', 'hand1', 2, 300],
  ['escudo-de-tapa', 'Escudo de Tapa de Olla', 'hand1', 2, 400],
  ['varita-de-chispas', 'Varita de Chispas', 'hand1', 3, 500, { only: 'mago' }],
  ['espada-cantarina', 'Espada Cantarina', 'hand1', 3, 600],
  ['martillo-del-abuelo', 'Martillo del Abuelo', 'hand1', 3, 500, { only: 'enano' }],
  ['arco-con-flechas-chuecas', 'Arco con Flechas Chuecas', 'hand2', 3, 400],
  ['hacha-gigante', 'Hacha Gigante', 'hand2', 4, 600, { big: true }],
  ['lanza-de-escoba', 'Lanza de Escoba', 'hand2', 2, 200],
  ['espadon-del-heroe', 'Espadón del Héroe Olvidado', 'hand2', 5, 800, { big: true, only: 'guerrero' }],
  ['escalera-de-mano', 'Escalera de Mano', 'big', 3, 400, { big: true }],
  ['cañon-portatil', 'Cañón Portátil', 'big', 4, 700, { big: true }],
  ['capa-de-sombras', 'Capa de Sombras', 'none', 2, 500],
  ['anillo-del-estornudo', 'Anillo del Estornudo', 'none', 1, 300],
  ['mochila-sin-fondo', 'Mochila sin Fondo', 'none', 1, 200],
];

/** [id, nombre, bonus, oro, extra?] — un solo uso, en combate, para cualquier bando. */
const ONE_SHOTS = [
  ['pocion-de-fuego', 'Poción de Fuego Embotellado', 3, 100],
  ['pocion-de-hielo', 'Poción de Hielo Repentino', 3, 100],
  ['bomba-de-humo-picante', 'Bomba de Humo Picante', 2, 100],
  ['pocion-de-fuerza-dudosa', 'Poción de Fuerza Dudosa', 2, 200],
  ['pergamino-de-insultos', 'Pergamino de Insultos Arcanos', 5, 200],
  ['frasco-de-abejas', 'Frasco de Abejas', 3, 200],
  ['pocion-de-escape', 'Poción de Escape Inmediato', 0, 200, { escape: true }],
];

const LEVEL_UPS = ['sube-nivel-1:Soborno al Narrador', 'sube-nivel-2:Atajo Sospechoso', 'sube-nivel-3:Herencia Inesperada', 'sube-nivel-4:Leíste el Manual', 'sube-nivel-5:Mascota Motivadora'];

export const CARDS = {};
const add = (c) => (CARDS[c.id] = c);

for (const [id, name, level, treasures, bad, extra = {}] of MONSTERS) add({ id, deck: 'door', kind: 'monster', name, level, treasures, bad, levels: extra.levels ?? 1, undead: Boolean(extra.undead), bonusVs: extra.bonusVs ?? {} });
for (const [id, name, effect, text] of CURSES) add({ id, deck: 'door', kind: 'curse', name, effect, text });
for (const r of RACES) for (let k = 1; k <= 3; k++) add({ id: `raza-${r}-${k}`, deck: 'door', kind: 'race', race: r, name: RACE_NAMES[r] });
for (const c of CLASSES) for (let k = 1; k <= 3; k++) add({ id: `clase-${c}-${k}`, deck: 'door', kind: 'class', cls: c, name: CLASS_NAMES[c] });
for (const [id, name, bonus, treasures] of ENHANCERS) add({ id: `pot-${id}`, deck: 'door', kind: 'enhancer', name, bonus, treasures });
for (let k = 1; k <= 3; k++) add({ id: `errante-${k}`, deck: 'door', kind: 'wandering', name: 'Monstruo Errante' });

for (const [id, name, slot, bonus, gold, extra = {}] of ITEMS) add({ id, deck: 'treasure', kind: 'item', name, slot, bonus, gold, big: Boolean(extra.big), only: extra.only ?? null, run: extra.run ?? 0 });
for (const [id, name, bonus, gold, extra = {}] of ONE_SHOTS) add({ id, deck: 'treasure', kind: 'oneshot', name, bonus, gold, escape: Boolean(extra.escape) });
for (const s of LEVEL_UPS) {
  const [id, name] = s.split(':');
  add({ id, deck: 'treasure', kind: 'levelup', name });
}

export const DOOR_IDS = Object.values(CARDS).filter((c) => c.deck === 'door').map((c) => c.id);
export const TREASURE_IDS = Object.values(CARDS).filter((c) => c.deck === 'treasure').map((c) => c.id);
export const SLOT_NAMES = { head: 'Cabeza', armor: 'Armadura', feet: 'Calzado', hand1: 'Una mano', hand2: 'Dos manos', big: 'Grande', none: 'Sin zona' };
export const WIN_LEVEL = 10;
