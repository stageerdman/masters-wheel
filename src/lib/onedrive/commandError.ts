// OneDrive and storage commands reject with { kind, message }
// (src-tauri/src/onedrive/error.rs CommandError). The kind picks the line
// the user sees; the message is for the log. Only "portBusy" shows its
// message, because it names the port, which lives in Rust (loopback.rs).

export type CommandErrorKind = "cancelled" | "orgBlocked" | "portBusy" | "offline" | "other";

const KINDS: readonly CommandErrorKind[] = ["cancelled", "orgBlocked", "portBusy", "offline", "other"];

function field(error: unknown, name: "kind" | "message"): unknown {
  return typeof error === "object" && error !== null ? (error as Record<string, unknown>)[name] : undefined;
}

export function errorKind(error: unknown): CommandErrorKind {
  const kind = field(error, "kind");
  return KINDS.includes(kind as CommandErrorKind) ? (kind as CommandErrorKind) : "other";
}

export function errorMessage(error: unknown): string {
  const message = field(error, "message");
  if (typeof message === "string") return message;
  return String(error);
}
