#!/usr/bin/env node
// Binario "claude" falso para pruebas de integracion. Emite eventos
// stream-json deterministas sin tocar la red ni requerir autenticacion.
// Comportamiento controlado por palabras clave en el prompt:
//   contiene "CRASH" -> escribe en stderr y sale con codigo 2
//   contiene "FAIL"  -> emite un result con is_error true (exit 0)
//   en otro caso     -> responde con "echo:<prompt>" y datos de la sesion

const args = process.argv.slice(2);

function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const prompt = flag("-p") ?? "";
const resume = flag("--resume");

if (prompt.includes("CRASH")) {
  process.stderr.write("fake-claude: simulated crash\n");
  process.exit(2);
}

const sessionId = resume ?? "test-session-0001";
const isError = prompt.includes("FAIL");
const text = isError
  ? "Not logged in"
  : `echo:${prompt}${resume ? `|resumed:${resume}` : ""}`;

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

// Linea de ruido para verificar que el cliente ignora lo que no es JSON.
process.stdout.write("not-json-noise\n");

emit({
  type: "system",
  subtype: "init",
  session_id: sessionId,
  model: "fake-model",
  tools: ["Read"],
  cwd: process.cwd(),
});
emit({
  type: "assistant",
  message: { role: "assistant", content: [{ type: "text", text }] },
  session_id: sessionId,
});
emit({
  type: "result",
  subtype: "success",
  is_error: isError,
  result: text,
  session_id: sessionId,
  num_turns: 1,
  duration_ms: 5,
  total_cost_usd: 0.001,
});

process.exit(0);
