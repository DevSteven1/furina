# Furina

Asistente de IA especializado. Por debajo se apoya en Claude Code CLI, pero busca
ser mas sencillo y enfocado, con capacidades de integracion especificas para
casos de uso concretos.

## Estado

En desarrollo inicial.

## Objetivo

Ofrecer un asistente ligero y especializado sobre la base de Claude Code,
priorizando la simplicidad y las integraciones a medida frente a la generalidad.

## Stack

- TypeScript (ESM, modo estricto)
- Node.js >= 20
- pnpm como gestor de paquetes

## Requisitos

- Node.js 20 o superior
- pnpm
- Claude Code CLI (`claude`) instalado y con sesion iniciada. Furina lo invoca
  por debajo y reutiliza tu autenticacion.

Para el modo multi-instancia (`spawn`/`show`/`kill`) ademas hace falta:

- Hyprland 0.55 o superior (el control de ventanas usa su API Lua via
  `hyprctl eval`).
- kitty como terminal (cada instancia se abre en una ventana de kitty).

## Instalacion

```
pnpm install
```

## Uso

Furina tiene dos modos:

Chat interactivo (mantiene el contexto entre turnos):

```
pnpm start          # o: pnpm dev
```

```
furina> hola
...respuesta...
furina> y que te dije antes
...recuerda el contexto...
furina> /exit
```

Comandos dentro del chat: `/new` (empezar de cero), `/help`, `/exit`
(tambien Ctrl+C o Ctrl+D).

Pregunta unica (one-shot):

```
pnpm dev ask "explicame que es furina"
pnpm dev "atajo equivalente a ask"
```

## Multi-instancia

Furina puede abrir varias instancias de claude a la vez, cada una en su propia
ventana, repartidas en rejilla sobre un workspace dedicado (`furina`) sin tocar
el que estas usando.

```
furina spawn 4                       # abre 4 instancias en el workspace furina
furina spawn 4 --prompt "resume X"   # mismo prompt en todas
furina spawn 2 --model <id> --gap 8  # modelo y hueco entre ventanas
furina show                          # cambia la vista al workspace furina
furina kill                          # cierra todas las ventanas de furina
```

El workspace `furina` es un workspace *named*, no uno numerado: tus atajos
habituales (Super+1, Super+2...) van a los numerados y no llegan a el. Para verlo
usa `furina show`, o crea un bind que enfoque `name:furina`.

`kill` solo cierra ventanas creadas por furina (clase `furina-worker-*`). Nunca
toca tu terminal, tu sesion de Claude Code ni ninguna otra ventana: antes de
cerrar comprueba la clase de la ventana activa y omite cualquiera ajena.

## Desarrollo

```
pnpm dev          # ejecuta el CLI con tsx (sin compilar)
pnpm typecheck    # valida tipos sin emitir
pnpm build        # compila a dist/
pnpm start        # ejecuta la version compilada (abre el chat)
```

## Pruebas

```
pnpm test         # una pasada
pnpm test:watch   # modo continuo
```

Hay pruebas unitarias y de integracion. Las de integracion ejecutan el cliente
contra un binario `claude` falso, sin red ni autenticacion. No hagas commit sin
correr los tests; ver [AGENT.md](AGENT.md).

## Convenciones

Las convenciones de desarrollo (commits, estilo, flujo de trabajo) estan
documentadas en [AGENT.md](AGENT.md). Leelo antes de contribuir.

Puntos clave:

- Conventional Commits con commits atomicos.
- Mensajes de commit en ingles.
- Nunca usar emojis.
