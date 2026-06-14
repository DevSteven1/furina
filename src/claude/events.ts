// Tipos de los eventos emitidos por `claude -p --output-format stream-json`.
// Cada linea de stdout es un objeto JSON de uno de estos tipos.

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown }
  | { type: string; [key: string]: unknown };

export interface SystemInitEvent {
  type: "system";
  subtype: "init";
  session_id: string;
  model: string;
  tools: string[];
  cwd: string;
  [key: string]: unknown;
}

export interface AssistantEvent {
  type: "assistant";
  message: {
    role: "assistant";
    content: ContentBlock[];
    usage?: UsageInfo;
    [key: string]: unknown;
  };
  session_id: string;
  parent_tool_use_id?: string | null;
  error?: string;
}

export interface UserEvent {
  type: "user";
  message: {
    role: "user";
    content: ContentBlock[];
  };
  session_id: string;
}

export interface ResultEvent {
  type: "result";
  subtype: string;
  is_error: boolean;
  result: string;
  session_id: string;
  num_turns: number;
  duration_ms: number;
  total_cost_usd: number;
  usage?: UsageInfo;
}

export type ClaudeEvent =
  | SystemInitEvent
  | AssistantEvent
  | UserEvent
  | ResultEvent
  | { type: string; [key: string]: unknown };
