"use client";

import { useRouter } from "next/navigation";
import { statusLine } from "@/lib/onedrive";
import { useStorageOverview } from "@/lib/onedrive/useStorageOverview";
import position from "./StorageStatusLine.position.module.css";
import styles from "./StorageStatusLine.styles.module.css";

export const STORAGE_SETTINGS_URL = "/settings?section=storage";

const UPLOADING_TOOLTIP =
  "If you quit or close the lid, uploads pause and pick up where they left off next time. Nothing leaves this Mac until it's safe.";

// The one storage message outside Settings (SPEC 6.2): one state, and a
// button that only opens Settings › Storage. Hidden when not connected.
export function StorageStatusLine() {
  const router = useRouter();
  const { overview } = useStorageOverview();
  const line = overview && statusLine(overview);
  if (!line) return null;

  const text = `${line.lead}${line.rest}`;
  return (
    <button
      type="button"
      className={`${styles.root} ${styles[line.tone]} ${position.root}`}
      data-construction
      title={line.tone === "text" ? UPLOADING_TOOLTIP : text}
      aria-label={`${text}, open storage settings`}
      aria-live="polite"
      onClick={() => router.push(STORAGE_SETTINGS_URL)}
    >
      {/* Keyed on the text so each new state fades in (200 ms). */}
      <span key={text} className={`${styles.label} ${position.label}`} data-construction>
        {line.lead && <strong>{line.lead}</strong>}
        {line.rest}
      </span>
    </button>
  );
}
