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

## Instalacion

```
pnpm install
```

## Desarrollo

```
pnpm dev          # ejecuta el CLI con tsx (sin compilar)
pnpm typecheck    # valida tipos sin emitir
pnpm build        # compila a dist/
pnpm start        # ejecuta la version compilada
```

Ejemplos:

```
pnpm dev --help
pnpm dev --version
```

## Convenciones

Las convenciones de desarrollo (commits, estilo, flujo de trabajo) estan
documentadas en [AGENT.md](AGENT.md). Leelo antes de contribuir.

Puntos clave:

- Conventional Commits con commits atomicos.
- Mensajes de commit en ingles.
- Nunca usar emojis.
