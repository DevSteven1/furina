# AGENT.md

Instrucciones y convenciones para cualquier agente de IA (incluido Claude Code)
que trabaje en este repositorio. Lee este archivo completo antes de hacer cambios.

## Sobre el proyecto

Furina es un asistente de IA especializado. Por debajo se apoya en Claude Code
CLI, pero su objetivo es ofrecer algo mas sencillo y enfocado, con capacidades de
integracion especificas para casos de uso concretos.

El stack es TypeScript (ESM, modo estricto) sobre Node.js >= 20, con pnpm como
gestor. No introduzcas dependencias ni un cambio de estructura grande sin
preguntar antes.

El modo multi-instancia integra con el entorno de escritorio: Hyprland (control
de ventanas via su API Lua, `hyprctl eval`) y kitty como terminal. Esa
integracion es especifica de ese entorno; no la asumas presente en los tests.

## Reglas de estilo

- Nunca uses emojis. Ni en codigo, ni en commits, ni en documentacion, ni en la
  salida del asistente.
- Escribe en espanol claro y directo en la documentacion del proyecto.
- Prefiere texto plano y simple. Evita adornos innecesarios.
- Comentarios solo cuando aporten valor; explica el "por que", no el "que".
- Manten la coherencia con el codigo existente: nombres, indentacion e idioma.

## Convenciones de commits

Usa Conventional Commits con commits atomicos. Los mensajes de commit se
escriben en ingles.

### Formato

```
<type>(<optional scope>): <description in imperative, lowercase>

<optional body explaining the why>

<optional footer: BREAKING CHANGE, refs, etc.>
```

### Tipos permitidos

- `feat`: nueva funcionalidad
- `fix`: correccion de un error
- `docs`: solo documentacion
- `style`: formato, espacios, sin cambios de logica
- `refactor`: cambio de codigo que no corrige error ni anade funcionalidad
- `perf`: mejora de rendimiento
- `test`: anadir o corregir pruebas
- `build`: cambios en el sistema de build o dependencias
- `ci`: cambios en configuracion de integracion continua
- `chore`: tareas de mantenimiento sin impacto en src
- `revert`: revierte un commit anterior

### Reglas

- Mensajes de commit en ingles.
- Commits atomicos: un commit = un cambio logico completo. Si un cambio toca
  varias cosas independientes, divide en varios commits.
- La descripcion va en imperativo y minuscula: "add validation", no
  "Added validation" ni "Adds validation".
- Sin punto final en la descripcion.
- Maximo 72 caracteres en la primera linea.
- Sin emojis en ningun commit.
- Nunca anadas un pie de coautor (sin `Co-Authored-By:`).
- Los cambios que rompen compatibilidad llevan `BREAKING CHANGE:` en el pie o un
  `!` despues del tipo o ambito (ej. `feat!: ...`).

### Ejemplos

```
feat(cli): add command to initialize the assistant
fix(parser): handle empty argument list
docs: document the integration flow with claude code
refactor(core): extract prompt logic into its own module
```

## Flujo de trabajo

- No hagas commits ni push salvo que se pida explicitamente.
- Nunca hagas commit sin correr los tests antes (`pnpm test`). Todos deben
  pasar. Si algun cambio toca tipos, corre tambien `pnpm typecheck`.
- Antes de hacer commit, deja el arbol de trabajo limpio y revisa el diff.
- Trabaja en ramas con nombre descriptivo cuando aplique: `feat/...`, `fix/...`.
- No subas secretos, claves ni archivos de configuracion local al repositorio.

## Pruebas

- Framework: vitest. Los tests viven en `test/`.
- Hay dos niveles: unitarios (funciones puras) e integracion (el cliente contra
  un binario `claude` falso en `test/fixtures/`, sin red ni autenticacion).
- Toda funcionalidad nueva debe ir acompanada de pruebas. Apunta a cubrir tanto
  el camino feliz como los errores.
- Comandos: `pnpm test` (una pasada) y `pnpm test:watch` (modo continuo).

## Estructura

- `src/index.ts`: punto de entrada del CLI y enrutado de subcomandos.
- `src/chat.ts`: chat interactivo con memoria de sesion.
- `src/claude/`: cliente que invoca Claude Code en modo stream-json y sus tipos
  de evento.
- `src/worker.ts`: punto de entrada de una instancia individual (corre un prompt
  y vuelca la respuesta en su ventana).
- `src/self.ts`: calcula como relanzar furina (dev con tsx o binario compilado).
- `src/orchestrator/`: orquesta el spawn, show y kill de las instancias.
- `src/window/`: calculo de la rejilla (`grid.ts`, logica pura) y apertura de
  ventanas de kitty (`spawn.ts`).
- `src/hypr/`: cliente de Hyprland (`client.ts`) y generacion del Lua de reglas
  y dispatch (`rules.ts`).
- `test/`: pruebas con vitest (unitarias e integracion).

Como ejecutar: ver [README.md](README.md) (`pnpm dev`, `pnpm build`,
`pnpm test`).
