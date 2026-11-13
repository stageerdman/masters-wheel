// Client Card types: a short read on the prospect's situation, pulled out
// of the call — what hurts, why it has to be fixed now, why it isn't fixed
// yet, what was offered, and what happens next. src/lib/records owns
// reading/writing client_card.json; this module owns the shape and the
// plain-text form the Copy button puts on the clipboard.

export type ClientCardField =
  | "problem"
  | "avoiding"
  | "whyNow"
  | "ifNotResolved"
  | "whyNotYet"
  | "offered"
  | "nextStep";

// Display order and the heading each field gets, both on screen and in
// the copied report — one source of truth so the two never drift apart.
export const CLIENT_CARD_FIELDS: { key: ClientCardField; heading: string }[] = [
  { key: "problem", heading: "Their problem" },
  { key: "avoiding", heading: "What they're trying to avoid" },
  { key: "whyNow", heading: "Why it has to be resolved now" },
  { key: "ifNotResolved", heading: "What happens if they can't" },
  { key: "whyNotYet", heading: "Why they haven't resolved it yet" },
  { key: "offered", heading: "What was offered" },
  { key: "nextStep", heading: "Next agreed step" },
];

export type ClientCard = {
  generatedAt: string;
} & Record<ClientCardField, string>;

// The copied report: plain text, heading then answer, blank line between
// — pastes cleanly into an email, CRM note, or chat.
export function clientCardToText(card: ClientCard, title: string): string {
  const sections = CLIENT_CARD_FIELDS.map(({ key, heading }) => `${heading}\n${card[key] || "—"}`);
  return [`Client Card — ${title}`, ...sections].join("\n\n");
}
