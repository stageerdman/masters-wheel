// Single-letter avatar glyph for an agent with no photo — first letter of
// its name, uppercased. Falls back to "?" for an unnamed draft so the
// roster/mention UI always has something to render.
export function agentInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}
