"use client";

import { useEffect, useRef, useState } from "react";
import type { RoleplayTurn } from "@/elements/TrainingRoom/children/ChatRoleplaySession/ChatRoleplaySession.data";
import position from "./RoleplayChat.position.module.css";
import styles from "./RoleplayChat.styles.module.css";

type RoleplayChatProps = {
  turns: RoleplayTurn[];
  thoughtsVisible: boolean;
  onToggleThoughts: () => void;
  onSend: (text: string, thought: string) => void;
};

// The dual-layer transcript: ordinary in-character dialogue, plus a
// private "thought" a turn can optionally carry — attached to, and sent
// together with, the very message it belongs to (one composer, one Send,
// not two separate actions). A thought always renders above its message,
// under the speaker's name. One eye icon shows/hides every thought at
// once — deliberately not the 3-state toggle the Artifact prototype had;
// that was explicitly called out as more UI than this needs.
export function RoleplayChat({ turns, thoughtsVisible, onToggleThoughts, onSend }: RoleplayChatProps) {
  const [replyValue, setReplyValue] = useState("");
  const [thoughtValue, setThoughtValue] = useState("");
  const [isThoughtExpanded, setIsThoughtExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns]);

  const thoughtCount = turns.filter((turn) => turn.thought).length;

  function handleSend() {
    if (!replyValue.trim()) return;
    onSend(replyValue, thoughtValue);
    setReplyValue("");
    setThoughtValue("");
    setIsThoughtExpanded(false);
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.topbar} data-construction>
        <button
          type="button"
          className={`${styles.eyeButton} ${position.eyeButton}`}
          data-construction
          aria-pressed={thoughtsVisible}
          aria-label={thoughtsVisible ? "Hide private thoughts" : "Show private thoughts"}
          title={thoughtCount > 0 ? `${thoughtCount} private thought${thoughtCount === 1 ? "" : "s"} — never sent to the roleplay` : undefined}
          onClick={onToggleThoughts}
        >
          {thoughtsVisible ? (
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path
                d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path d="M1.5 1.5l13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path
                d="M2 8s3-5 7-5c1 0 1.9.2 2.7.6M14 8s-1 1.7-2.8 3.1M6 6.3C5.4 6.8 5 7.4 5 8c0 1.7 1.3 3 3 3 .6 0 1.2-.2 1.7-.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>
      <div ref={listRef} className={position.list} data-construction>
        {turns.map((turn) => {
          const speakerLabel = turn.speaker === "persona" ? "Marcus" : "You";
          const showThought = Boolean(turn.thought) && thoughtsVisible;
          const showHiddenMarker = Boolean(turn.thought) && !thoughtsVisible;
          return (
            <div key={turn.id} className={`${position.row} ${turn.speaker === "user" ? position.rowUser : ""}`} data-construction>
              <span className={`${styles.speakerLabel} ${position.speakerLabel}`} data-construction>
                {speakerLabel}
                {showHiddenMarker && (
                  <span className={`${styles.hiddenMarker} ${position.hiddenMarker}`} data-construction title="1 hidden thought">
                    ⊘
                  </span>
                )}
              </span>
              {showThought && turn.thought && (
                <div
                  className={`${styles.thought} ${position.thought} ${turn.thought.author === "ai" ? styles.thoughtAi : styles.thoughtUser}`}
                  data-construction
                >
                  <span className={position.thoughtLabel} data-construction>
                    {turn.thought.author === "ai" ? "AI thought" : "Your thought"}
                  </span>
                  {turn.thought.text}
                </div>
              )}
              <div className={`${styles.bubble} ${position.bubble} ${turn.speaker === "user" ? styles.bubbleUser : ""}`} data-construction>
                {turn.text}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`${styles.composer} ${position.composer}`} data-construction>
        <div className={position.sayRow} data-construction>
          <input
            type="text"
            className={`${styles.input} ${position.input}`}
            data-construction
            placeholder="Reply to Marcus…"
            value={replyValue}
            onChange={(event) => setReplyValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSend();
            }}
          />
          <button
            type="button"
            className={`${styles.send} ${position.send}`}
            data-construction
            onClick={handleSend}
            disabled={replyValue.trim().length === 0}
            aria-label="Send"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M8 2 L8 13 M3 7 L8 2 L13 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className={`${position.seam} ${isThoughtExpanded ? styles.seamActive : styles.seam}`} data-construction />
        {isThoughtExpanded ? (
          <div className={`${styles.thinkRow} ${position.thinkRow}`} data-construction>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={styles.padlock}>
              <rect x="3.5" y="7" width="9" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <input
              type="text"
              className={`${styles.thinkInput} ${position.thinkInput}`}
              data-construction
              autoFocus
              placeholder="Think something…"
              value={thoughtValue}
              onChange={(event) => setThoughtValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
                if (event.key === "Escape") {
                  setThoughtValue("");
                  setIsThoughtExpanded(false);
                }
              }}
            />
          </div>
        ) : (
          <button type="button" className={`${styles.thinkToggle} ${position.thinkToggle}`} data-construction onClick={() => setIsThoughtExpanded(true)}>
            ✎ Think something
          </button>
        )}
      </div>
    </div>
  );
}
