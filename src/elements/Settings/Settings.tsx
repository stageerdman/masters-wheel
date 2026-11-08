"use client";

import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import { readSettings, writeSettings } from "@/lib/settings";
import position from "./Settings.position.module.css";
import styles from "./Settings.styles.module.css";

const WRITE_DEBOUNCE_MS = 400;

export function Settings() {
  const { setBrand } = useHeaderActions();
  const [businessDescription, setBusinessDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setBrand({ label: "Settings", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  useEffect(() => {
    let cancelled = false;
    readSettings().then((settings) => {
      if (cancelled) return;
      setBusinessDescription(settings.businessDescription);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(value: string) {
    setBusinessDescription(value);
    if (!isTauri()) return;
    clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      writeSettings({ businessDescription: value }).catch((error) =>
        console.error("Failed to write settings:", error)
      );
    }, WRITE_DEBOUNCE_MS);
  }

  if (isLoading) return null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <label className={`${styles.label} ${position.label}`} data-construction htmlFor="settings-business-description">
        What are you selling, or what do you do in this workspace?
      </label>
      <textarea
        id="settings-business-description"
        className={`${styles.textarea} ${position.textarea}`}
        data-construction
        value={businessDescription}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="e.g. I sell enterprise security software to mid-market IT teams."
      />
    </div>
  );
}
