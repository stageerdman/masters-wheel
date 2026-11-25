"use client";

import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import { readSettings, writeSettings, type ScorecardCriterionDef, type SpaceSettings } from "@/lib/settings";
import { BackgroundImage } from "./children/BackgroundImage/BackgroundImage";
import { SettingsSidebar, type SettingsCategory } from "./children/SettingsSidebar/SettingsSidebar";
import { ProfilePanel } from "./children/ProfilePanel/ProfilePanel";
import { ScorePanel } from "./children/ScorePanel/ScorePanel";
import { StoragePanel } from "./children/StoragePanel/StoragePanel";
import position from "./Settings.position.module.css";
import styles from "./Settings.styles.module.css";

const WRITE_DEBOUNCE_MS = 400;

export function Settings() {
  const { setBrand } = useHeaderActions();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("profile");
  const [businessDescription, setBusinessDescription] = useState("");
  const [scorecardCriteria, setScorecardCriteria] = useState<ScorecardCriterionDef[]>([]);
  const [scorecardSummaryPrompt, setScorecardSummaryPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // One debounce timer per settings field, so typing in one field never
  // cancels another field's pending write.
  const writeTimers = useRef<Partial<Record<keyof SpaceSettings, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    setBrand({ label: "Settings", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  useEffect(() => {
    let cancelled = false;
    readSettings().then((settings) => {
      if (cancelled) return;
      // The video list's storage status line links here (?section=storage).
      if (new URLSearchParams(window.location.search).get("section") === "storage") setActiveCategory("storage");
      setBusinessDescription(settings.businessDescription);
      setScorecardCriteria(settings.scorecardCriteria);
      setScorecardSummaryPrompt(settings.scorecardSummaryPrompt);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function debouncedWrite<K extends keyof SpaceSettings>(key: K, value: SpaceSettings[K]) {
    if (!isTauri()) return;
    clearTimeout(writeTimers.current[key]);
    writeTimers.current[key] = setTimeout(() => {
      writeSettings({ [key]: value }).catch((error) => console.error("Failed to write settings:", error));
    }, WRITE_DEBOUNCE_MS);
  }

  function handleBusinessDescriptionChange(value: string) {
    setBusinessDescription(value);
    debouncedWrite("businessDescription", value);
  }

  function handleScorecardCriteriaChange(next: ScorecardCriterionDef[]) {
    setScorecardCriteria(next);
    debouncedWrite("scorecardCriteria", next);
  }

  function handleScorecardSummaryPromptChange(value: string) {
    setScorecardSummaryPrompt(value);
    debouncedWrite("scorecardSummaryPrompt", value);
  }

  if (isLoading) return null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <BackgroundImage />
      <SettingsSidebar active={activeCategory} onSelect={setActiveCategory} />
      <div className={position.content} data-construction>
        {activeCategory === "profile" ? (
          <ProfilePanel
            businessDescription={businessDescription}
            onBusinessDescriptionChange={handleBusinessDescriptionChange}
          />
        ) : activeCategory === "score" ? (
          <ScorePanel
            criteria={scorecardCriteria}
            onChange={handleScorecardCriteriaChange}
            summaryPrompt={scorecardSummaryPrompt}
            onSummaryPromptChange={handleScorecardSummaryPromptChange}
          />
        ) : (
          <StoragePanel />
        )}
      </div>
    </div>
  );
}
