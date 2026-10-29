"use client";

import type { KeyboardEvent } from "react";
import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import { useMentionPicker } from "./Composer.script";
import position from "./Composer.position.module.css";
import styles from "./Composer.styles.module.css";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  density: "compact" | "comfortable";
  agents: Agent[];
};

export function Composer({ value, onChange, onSend, density, agents }: ComposerProps) {
  const { textareaRef, isOpen, matches, activeIndex, selectAgent, handleChange, handleKeyDown } = useMentionPicker(
    value,
    onChange,
    agents,
  );

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (handleKeyDown(event)) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  const densityClass = density === "comfortable" ? position.comfortable : "";

  return (
    <div className={`${styles.root} ${position.root} ${densityClass}`} data-construction>
      {isOpen && (
        <div className={`${styles.mentionMenu} ${position.mentionMenu}`} data-construction>
          {matches.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              className={`${styles.mentionItem} ${position.mentionItem} ${
                index === activeIndex ? styles.mentionItemActive : ""
              }`}
              data-construction
              onClick={() => selectAgent(agent)}
            >
              <span className={`${styles.mentionAvatar} ${position.mentionAvatar}`} data-construction>
                {agent.initial}
              </span>
              <span className={styles.mentionName} data-construction>
                {agent.name}
              </span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className={`${styles.input} ${position.input}`}
        data-construction
        rows={1}
        value={value}
        placeholder="Message the assistant — type @ to bring in an agent"
        onChange={handleChange}
        onKeyDown={handleTextareaKeyDown}
      />
      <button
        type="button"
        className={`${styles.send} ${position.send}`}
        data-construction
        onClick={onSend}
        disabled={value.trim().length === 0}
        aria-label="Send message"
      >
        <svg className={styles.sendGlyph} data-construction viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M8 2 L8 13 M3 7 L8 2 L13 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
