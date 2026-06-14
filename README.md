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
