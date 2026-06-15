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

## Orquestacion

El modo principal: le das una tarea de alto nivel y furina decide como dividirla
en agentes que trabajan en paralelo, recoge sus resultados y los sintetiza en una
respuesta final.

```
furina do "investiga X, compara Y y escribe un resumen"
```

El flujo es:

1. **Planifica**: claude divide la tarea en subtareas (un agente por subtarea).
2. **Reparte**: lanza un agente por subtarea, cada uno en su ventana.
3. **Recoge**: cada agente vuelca su resultado en `~/.furina/runs/<id>/`.
4. **Sintetiza**: claude junta los resultados en una respuesta final unificada,
   que se imprime y se guarda en `summary.md`.

Opciones:

```
furina do "..." --model <id>     # modelo para planner, agentes y sintesis
furina do "..." --gap 8          # hueco entre ventanas
furina do "..." --kill           # cierra las ventanas al terminar
furina do "..." --timeout 300000 # ms maximos de espera por los agentes
furina do "..." --retries 2      # reintentos por agente fallido (por defecto 1)
```

Cada ejecucion deja en `~/.furina/runs/<id>/` el plan (`plan.json`), el
resultado de cada agente (`agent-N.md`) y la sintesis (`summary.md`).

### Robustez

Un agente puede fallar (error de claude) o expirar (no terminar dentro del
timeout). Furina distingue ambos casos del exito leyendo el estado que cada
agente deja en su marca `.done`, y por defecto **relanza una vez** a los que no
terminaron bien (ajustable con `--retries`, `--retries 0` lo desactiva). Cada
reintento abre una ventana nueva para ese agente. Si tras los reintentos alguno
sigue sin terminar bien, la sintesis recibe su resultado marcado como fallido o
expirado para que lo tenga en cuenta, y el CLI lo informa por stderr.

## Multi-instancia

A bajo nivel, furina tambien permite abrir varias instancias de claude a mano,
cada una en su propia ventana, repartidas en rejilla sobre un workspace dedicado
(`furina`) sin tocar el que estas usando.

```
furina spawn 4                       # abre 4 instancias en el workspace furina
furina spawn 4 --prompt "resume X"   # mismo prompt en todas
furina spawn 2 --model <id> --gap 8  # modelo y hueco entre ventanas
furina show                          # cambia la vista al workspace furina
furina kill                          # cierra todas las ventanas de furina
```

El workspace `furina` es un workspace *named*, no uno numerado: tus atajos
habituales (Super+1, Super+2...) van a los numerados y no llegan a el. Por eso,
por defecto, `furina do` y `furina spawn` te llevan al workspace para que veas a
los agentes trabajar (`do` te devuelve a tu sitio al terminar). Usa
`--background` para no cambiar de vista, y `furina show` para ir cuando quieras.

Si prefieres llegar a mano, anade a tu config de Hyprland un bind que enfoque
`name:furina` (los binds van en Lua en 0.55+).

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
