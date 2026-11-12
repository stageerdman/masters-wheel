"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { GenerateStage } from "@/lib/transcript/generate";
import position from "./TranscriptionProgress.position.module.css";
import styles from "./TranscriptionProgress.styles.module.css";

type TranscriptionProgressProps = {
  stage: GenerateStage;
  // Upload percentage while uploading; null otherwise.
  percent: number | null;
  // Job start, ms since epoch — drives the elapsed counter.
  startedAt: number;
  // Optional "what" (e.g. "track 2 of 3 — Rep"), shown before the stage.
  subject?: string;
};

function stageText(stage: GenerateStage, percent: number | null): string {
  if (stage === "extracting") return "Preparing audio…";
  if (stage === "uploading") return `Uploading to ElevenLabs${percent !== null ? ` · ${percent}%` : "…"}`;
  return "ElevenLabs is transcribing…";
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// A running transcription's live status — which stage it's in, a real
// upload bar (indeterminate while preparing/processing, where there's no
// honest sub-progress), and a ticking elapsed time so a long call never
// looks frozen. Shared by Performance Review's TranscriptGenerating and
// Training Room's TranscriptPanel; each adds its own Stop button.
export function TranscriptionProgress({ stage, percent, startedAt, subject }: TranscriptionProgressProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const determinate = stage === "uploading" && percent !== null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction role="status" aria-live="polite">
      <p className={`${styles.statusText} ${position.statusText}`} data-construction>
        {subject ? `${subject} — ` : ""}
        {stageText(stage, percent)}
      </p>
      <div className={`${styles.track} ${position.track}`} data-construction>
        <div
          className={`${styles.fill} ${position.fill} ${determinate ? `${styles.fillDeterminate} ${position.fillDeterminate}` : ""}`}
          data-construction
          style={determinate ? ({ "--progress": `${percent}%` } as CSSProperties) : undefined}
        />
      </div>
      <p className={`${styles.elapsed} ${position.elapsed}`} data-construction>
        {formatElapsed(now - startedAt)} elapsed
      </p>
    </div>
  );
}
