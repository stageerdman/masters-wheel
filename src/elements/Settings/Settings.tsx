"use client";

import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import { readSettings, writeSettings, type ScorecardCriterionDef } from "@/lib/settings";
import { BackgroundImage } from "./children/BackgroundImage/BackgroundImage";
import { SettingsSidebar, type SettingsCategory } from "./children/SettingsSidebar/SettingsSidebar";
import { ProfilePanel } from "./children/ProfilePanel/ProfilePanel";
import { ScorePanel } from "./children/ScorePanel/ScorePanel";
import position from "./Settings.position.module.css";
import styles from "./Settings.styles.module.css";

const WRITE_DEBOUNCE_MS = 400;

export function Settings() {
  const { setBrand } = useHeaderActions();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("profile");
  const [businessDescription, setBusinessDescription] = useState("");
  const [scorecardCriteria, setScorecardCriteria] = useState<ScorecardCriterionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const businessDescriptionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scorecardCriteriaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setBrand({ label: "Settings", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  useEffect(() => {
    let cancelled = false;
    readSettings().then((settings) => {
      if (cancelled) return;
      setBusinessDescription(settings.businessDescription);
      setScorecardCriteria(settings.scorecardCriteria);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleBusinessDescriptionChange(value: string) {
    setBusinessDescription(value);
    if (!isTauri()) return;
    clearTimeout(businessDescriptionTimer.current);
    businessDescriptionTimer.current = setTimeout(() => {
      writeSettings({ businessDescription: value }).catch((error) =>
        console.error("Failed to write settings:", error)
      );
    }, WRITE_DEBOUNCE_MS);
  }

  function handleScorecardCriteriaChange(next: ScorecardCriterionDef[]) {
    setScorecardCriteria(next);
    if (!isTauri()) return;
    clearTimeout(scorecardCriteriaTimer.current);
    scorecardCriteriaTimer.current = setTimeout(() => {
      writeSettings({ scorecardCriteria: next }).catch((error) =>
        console.error("Failed to write settings:", error)
      );
    }, WRITE_DEBOUNCE_MS);
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
        ) : (
          <ScorePanel criteria={scorecardCriteria} onChange={handleScorecardCriteriaChange} />
        )}
      </div>
    </div>
  );
}
