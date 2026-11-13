"use client";

import { useEffect, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { CLIENT_CARD_FIELDS, clientCardToText, type ClientCard as ClientCardData } from "@/lib/clientCard";
import position from "./ClientCard.position.module.css";
import styles from "./ClientCard.styles.module.css";

const COPIED_FEEDBACK_MS = 1500;

type ClientCardProps = {
  data: ClientCardData | null;
  // The record's title — heads the copied report so it's clear which
  // client it's about once pasted somewhere else.
  title: string;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
};

// A summary of the client's situation, generated from the transcript by
// a real `claude` CLI call (src/lib/clientCard/generate.ts). Same three
// states as QuestionAnalysis — nothing yet (Generate / error + Try
// again), generating, or a real result — plus one Copy button that puts
// the whole card on the clipboard as plain text.
export function ClientCard({ data, title, isGenerating, onGenerate, error }: ClientCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copyState]);

  if (!data) {
    return (
      <div className={`${styles.root} ${position.root} ${position.empty}`} data-construction>
        {isGenerating ? (
          <>
            <p className={`${styles.statusText} ${position.statusText}`} data-construction>
              Writing client card…
            </p>
            <p className={`${styles.statusSubtext} ${position.statusSubtext}`} data-construction>
              This can take a minute.
            </p>
          </>
        ) : error ? (
          <>
            <p className={`${styles.errorText} ${position.errorText}`} data-construction>
              {error}
            </p>
            <button
              type="button"
              className={`${styles.generateButton} ${position.generateButton}`}
              data-construction
              onClick={onGenerate}
            >
              Try again
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${styles.generateButton} ${position.generateButton}`}
            data-construction
            onClick={onGenerate}
          >
            Generate Client Card
          </button>
        )}
      </div>
    );
  }

  function handleCopy() {
    if (!data) return;
    writeText(clientCardToText(data, title))
      .then(() => setCopyState("copied"))
      .catch((copyError) => {
        console.error("Failed to copy client card:", copyError);
        setCopyState("failed");
      });
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.header} data-construction>
        <h2 className={`${styles.title} ${position.title}`} data-construction>
          Client Card
        </h2>
        <button
          type="button"
          className={`${styles.copyButton} ${position.copyButton}`}
          data-construction
          onClick={handleCopy}
          aria-live="polite"
        >
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Couldn't copy" : "Copy"}
        </button>
      </div>
      {isGenerating && (
        <p className={`${styles.statusText} ${position.statusText}`} data-construction>
          Regenerating…
        </p>
      )}
      {!isGenerating && error && (
        <p className={`${styles.errorText} ${position.errorText}`} data-construction>
          {error}
        </p>
      )}
      <dl className={position.list} data-construction>
        {CLIENT_CARD_FIELDS.map(({ key, heading }) => (
          <div key={key} className={`${styles.section} ${position.section}`} data-construction>
            <dt className={`${styles.heading} ${position.heading}`} data-construction>
              {heading}
            </dt>
            <dd className={`${styles.answer} ${position.answer}`} data-construction>
              {data[key] || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
