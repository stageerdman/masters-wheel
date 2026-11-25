"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud } from "@phosphor-icons/react";
import { AnchoredPopup } from "@/elements/AnchoredPopup/AnchoredPopup";
import { useAnchoredPopup } from "@/lib/useAnchoredPopup";
import { formatBytes, problemNotice, statusLine, videos, type TitleOf } from "@/lib/onedrive/panelText";
import { retryUnreadableVideos, type StorageOverview } from "@/lib/onedrive/storage";
import { useStorageOverview } from "@/lib/onedrive/useStorageOverview";
import {
  addSample,
  ariaLabel,
  cloudState,
  isPaused,
  progress,
  timeLeft,
  type CloudState,
  type Sample,
} from "./CloudStatus.script";
import position from "./CloudStatus.position.module.css";
import styles from "./CloudStatus.styles.module.css";

const SETTINGS_URL = "/settings?section=storage";
const REFRESH_MS = 3000;
const LID_SENTENCE =
  "If you quit or close the lid, uploads pause and pick up where they left off next time. Nothing leaves this Mac until it's safe.";

// Ring geometry inside the 28 px button.
const SIZE = 28;
const RADIUS = 12.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type CloudStatusProps = { titleOf: TitleOf };

// The one upload status in Performance Review: a quiet cloud at the header's
// right edge, with the details one click away. docs/cloud-status-icon/.
export function CloudStatus({ titleOf }: CloudStatusProps) {
  const { overview, refresh } = useStorageOverview();
  const { anchorRef, open, anchorRect, toggleOpen, close } = useAnchoredPopup<HTMLButtonElement>();
  const [samples, setSamples] = useState<Sample[]>([]);

  const state = cloudState(overview);
  const { fraction, count } = overview ? progress(overview) : { fraction: 0, count: 0 };
  const paused = overview ? isPaused(overview) : false;
  const percent = Math.round(fraction * 100);
  const motion = useRingMotion(state, percent, count > 0);

  // Keep the ring and time left moving between storage://changed events.
  useEffect(() => {
    if (state !== "uploading") return;
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [state, refresh]);

  useEffect(() => {
    if (!overview) return;
    const sample = { t: Date.now(), bytes: overview.uploadBytesLeft };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a sample per new overview
    setSamples((current) => addSample(current, sample));
  }, [overview]);

  if (state === "hidden" || !overview) return null;

  const showRing = motion.landing || (state !== "idle" && count > 0);
  const ringPercent = motion.landing ? 100 : percent;
  const ringMuted = !motion.landing && (paused || state === "problem");
  const label = ariaLabel(state, paused, percent);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${styles.button} ${position.button}`}
        data-construction
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <Cloud size={18} weight="regular" className={`${styles.cloud} ${position.cloud}`} data-construction aria-hidden />
        {showRing && (
          <svg
            className={[
              styles.ring,
              position.ring,
              motion.ringEnter ? styles.settleIn : "",
              motion.landing ? styles.landing : "",
            ].join(" ")}
            data-construction
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
            onAnimationEnd={motion.landing ? motion.endLanding : undefined}
          >
            <circle
              className={[styles.arc, ringMuted ? styles.arcMuted : "", motion.snap ? styles.noTransition : ""].join(" ")}
              data-construction
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ringPercent / 100)}
            />
          </svg>
        )}
        {state === "problem" && (
          <span
            className={`${styles.dot} ${position.dot} ${motion.dotEnter ? styles.settleIn : ""}`}
            data-construction
            aria-hidden
          />
        )}
      </button>
      {open && anchorRect && (
        <AnchoredPopup anchorRect={anchorRect} onClose={close}>
          <Details
            overview={overview}
            state={state}
            paused={paused}
            count={count}
            eta={timeLeft(samples, overview.uploadBytesLeft)}
            titleOf={titleOf}
            onRetry={() => {
              retryUnreadableVideos()
                .then(refresh)
                .catch((error) => console.error("[storage] CloudStatus: retry failed:", error));
            }}
            onNavigate={close}
          />
        </AnchoredPopup>
      )}
    </>
  );
}

type DetailsProps = {
  overview: StorageOverview;
  state: CloudState;
  paused: boolean;
  count: number;
  eta: string | null;
  titleOf: TitleOf;
  onRetry: () => void;
  onNavigate: () => void;
};

// Problem first (that's why they clicked), then the lid answer, the numbers,
// the time left, passing errors, and one way to Settings.
function Details({ overview: o, state, paused, count, eta, titleOf, onRetry, onNavigate }: DetailsProps) {
  const notice = state === "problem" || o.signInPending ? problemNotice(o, titleOf) : null;
  const line = statusLine(o);
  const lineText = line ? `${line.lead}${line.rest}` : null;
  const errors = o.videos.filter((v) => v.lastError !== null);
  const linkLabel =
    notice?.action === "signIn" ? "Sign in to OneDrive" : notice?.action === "manageStorage" ? "Manage storage" : "Storage settings";

  return (
    <div className={`${styles.panel} ${position.panel}`} data-construction role="dialog" aria-label="OneDrive uploads">
      {notice && (
        <div className={position.notice} data-construction>
          <p className={styles.text} data-construction>
            <strong>{notice.lead}</strong>
            {notice.rest}
          </p>
          {notice.action === "retry" && (
            <button type="button" className={`${styles.retry} ${position.retry}`} data-construction onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}
      {state === "uploading" && (
        <p className={styles.text} data-construction>
          {LID_SENTENCE}
        </p>
      )}
      {state === "idle" && lineText && (
        <p className={styles.text} data-construction>
          {lineText}
        </p>
      )}
      {count > 0 && (
        <p className={styles.text} data-construction>
          {videos(count)} · {formatBytes(o.uploadBytesLeft)} left
        </p>
      )}
      {!o.online && lineText ? (
        <p className={styles.muted} data-construction>
          {lineText}
        </p>
      ) : (
        !paused && eta && (
          <p className={styles.muted} data-construction>
            {eta}
          </p>
        )
      )}
      {errors.map((v) => (
        <p key={`${v.spaceId}/${v.recordId}/${v.fileName}`} className={styles.muted} data-construction>
          {v.fileName}: {v.lastError} · retrying in a moment
        </p>
      ))}
      <Link href={SETTINGS_URL} className={`${styles.link} ${position.link}`} data-construction onClick={onNavigate}>
        {linkLabel}
      </Link>
    </div>
  );
}

// The three quiet touches from 02-magic.md: the ring fills (and snaps back
// when the percent drops), ring and dot settle in when they appear live, and
// the ring holds at 100% then fades when the last upload lands. Nothing moves
// on first render.
function useRingMotion(state: CloudState, percent: number, moving: boolean) {
  const ring = state !== "idle" && state !== "hidden" && moving;
  const dot = state === "problem";
  const [seen, setSeen] = useState({ state, percent, ring, dot });
  const [snap, setSnap] = useState(true);
  const [landing, setLanding] = useState(false);
  const [ringEnter, setRingEnter] = useState(false);
  const [dotEnter, setDotEnter] = useState(false);

  // Adjust during render (React's "storing information from previous
  // renders"), so the first frame of a change already has the right classes.
  if (seen.state !== state || seen.percent !== percent || seen.ring !== ring || seen.dot !== dot) {
    setSeen({ state, percent, ring, dot });
    if (percent < seen.percent) setSnap(true);
    if (seen.state === "uploading" && state === "idle") setLanding(true);
    if (state !== "idle") setLanding(false);
    if (ring !== seen.ring) setRingEnter(ring && !landing);
    if (dot !== seen.dot) setDotEnter(dot);
  }

  useEffect(() => {
    if (!snap) return;
    const id = requestAnimationFrame(() => setSnap(false));
    return () => cancelAnimationFrame(id);
  }, [snap]);

  return { snap, landing, ringEnter, dotEnter, endLanding: () => setLanding(false) };
}
