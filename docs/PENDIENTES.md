# Estado de la Fase 1 y pendientes

## Funciona de verdad

- Página principal, catálogo y navegación (`#/` ↔ `#/juegos/magnate`, botón "Salir al catálogo").
- Carga diferida del juego desde el catálogo.
- Tablero de 40 casillas generado desde datos: propiedades por color, estaciones, servicios, impuestos, Fortuna, Arca Vecinal y las 4 esquinas.
- Clic en una casilla → ficha informativa (alquileres, precio, casa, hipoteca, dueño, edificios). `Esc` o un segundo clic la cierran.
- Pasar el cursor sobre un jugador resalta sus propiedades y su ficha en el tablero.
- Representación de 2 a 8 fichas, incluidas 8 en una misma casilla y la cárcel (dentro / de visita).
- Indicadores visuales: dueño (franja de color), casas/hotel, hipotecada, turno actual, estados del jugador.

## Sólo visual / simulado

- Todos los datos de la partida (dinero, posiciones, propiedades, dados, registro, cartas restantes) son simulados.
- Panel "Prueba de interfaz": cambia el número de jugadores, el escenario y recoloca fichas al azar. No es parte del juego.
- Dados: muestran una tirada ficticia.
- Mazos de Fortuna y Arca Vecinal: decorativos.

## Botones pendientes (rotulados "Pendiente")

Lanzar dados · Comprar · Subastar · Terminar turno · Construir · Hipotecar · Negociar · Rendirse ·
Reglamento · Invitar amigos · Crear sala privada · Iniciar sesión · Salas · "Jugar" en juegos próximos.

## Antes del motor de reglas (Fase 2)

Documentar el reglamento de Magnate y sus casos especiales, entre otros:

- Dinero inicial y salario de Salida; ¿se cobra al caer o sólo al pasar?
- Dobles: tres seguidos → cárcel; ¿se relanza tras comprar o pagar?
- Cárcel: multa, cartas, máximo de turnos, ¿se cobra alquiler estando preso?
- Subasta obligatoria al rechazar una compra: puja mínima, tiempo límite online, ¿participa quien rechazó?
- Construcción pareja, escasez de casas/hoteles en la banca y subasta de edificios escasos.
- Alquiler doble con grupo completo sin construir; ¿y con alguna propiedad hipotecada?
- Hipotecas: interés del 10 %, traspaso de propiedades hipotecadas en negociaciones.
- Negociaciones: qué se puede intercambiar, ¿fuera de turno?
- Bancarrota ante otro jugador vs. ante la banca; destino de propiedades y edificios.
- Contenido exacto de las 32 cartas (16 + 16), con textos propios.
- Fin de partida: último superviviente; ¿límite de tiempo opcional más adelante?
- Desconexiones online: tiempo de espera, turnos automáticos, reconexión.

## Fases siguientes (no empezadas)

- Motor de reglas puro + tests.
- Servidor Node + Socket.IO autoritativo, salas privadas con código.
- Persistencia (PostgreSQL / Supabase).
- Animación de movimiento casilla por casilla.
