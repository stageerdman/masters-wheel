// Tracks every AI reply currently in flight, keyed by the reply message's
// own id — independent of whichever `useAIAssistant()` instance/component
// actually dispatched it. Plain module state (same tiny shape as
// src/lib/spaces/activeSpaceStore.ts), so it's unaffected by any component
// mounting or unmounting: a reply's real completion (AIAssistant.script.ts's
// askAgent call + the Tauri progress listener it owns) already keeps
// running and persists correctly to disk even after the component that
// started it unmounts — this registry exists purely so that whichever
// component is *currently showing* that message (the original one, or a
// brand-new instance that remounted after the user switched to a
// different Training Room session, left Training Room entirely, or
// switched to a different chat) can paint the real, live answer instead
// of either freezing on an empty "thinking" bubble forever or wrongly
// declaring the reply failed just because this particular instance wasn't
// around to see it finish.

import type { ChatMessageRole } from "@/lib/chat";

export type PendingReplyUpdate = { text: string; role: ChatMessageRole; done: boolean };

type Listener = (update: PendingReplyUpdate) => void;

type PendingReplyEntry = {
  text: string;
  listeners: Set<Listener>;
};

const pending = new Map<string, PendingReplyEntry>();

// Called the instant a reply's placeholder message is created — before
// anything is awaited — so `isReplyPending`/`attachToPendingReply` can see
// it from the very first render that shows it.
export function beginPendingReply(messageId: string): void {
  pending.set(messageId, { text: "", listeners: new Set() });
}

// Called for every streamed delta. Broadcasts the running total to every
// attached listener, not just the one that dispatched the request.
export function growPendingReply(messageId: string, delta: string): void {
  const entry = pending.get(messageId);
  if (!entry) return;
  entry.text += delta;
  const update: PendingReplyUpdate = { text: entry.text, role: "assistant", done: false };
  for (const listener of entry.listeners) listener(update);
}

// Called exactly once, by whichever call to dispatchAgentReply actually
// started this reply, when it finishes — successfully (role stays
// "assistant", text is the model's real final answer) or not (role
// becomes "system", the same shape failAgentReply already persists to
// disk). Every attached listener gets this same final update so it can
// mirror it into its own in-memory state immediately, without waiting for
// a fresh disk read.
export function endPendingReply(messageId: string, text: string, role: ChatMessageRole): void {
  const entry = pending.get(messageId);
  if (entry) {
    const update: PendingReplyUpdate = { text, role, done: true };
    for (const listener of entry.listeners) listener(update);
  }
  pending.delete(messageId);
}

// A message still showing empty text on a fresh load is only genuinely
// stuck (abandoned request, e.g. from a previous app launch) if this
// returns false — if it returns true, something in this same running app
// instance is still actively receiving that reply.
export function isReplyPending(messageId: string): boolean {
  return pending.has(messageId);
}

// Lets a brand-new `useAIAssistant()` instance reconnect to a reply some
// earlier, since-unmounted instance is still actually receiving. Returns
// the text already accumulated so far (so the caller can paint it
// immediately, no flash back to "thinking") and keeps calling `onUpdate`
// for every later delta and the eventual finish, until either that finish
// happens (auto-detaches) or the caller unsubscribes (its own unmount).
export function attachToPendingReply(
  messageId: string,
  onUpdate: Listener,
): { text: string; unsubscribe: () => void } | null {
  const entry = pending.get(messageId);
  if (!entry) return null;
  entry.listeners.add(onUpdate);
  return {
    text: entry.text,
    unsubscribe: () => entry.listeners.delete(onUpdate),
  };
}
