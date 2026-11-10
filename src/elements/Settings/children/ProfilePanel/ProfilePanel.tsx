"use client";

import { useState } from "react";
import { PromptRow } from "@/elements/PromptRow/PromptRow";
import position from "./ProfilePanel.position.module.css";

type ProfilePanelProps = {
  businessDescription: string;
  onBusinessDescriptionChange: (value: string) => void;
};

// Today this is a single prompt row (business description); the shape
// supports more rows the moment a second Profile-category setting is
// dictated.
export function ProfilePanel({ businessDescription, onBusinessDescriptionChange }: ProfilePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className={position.root} data-construction>
      <PromptRow
        label="What are you selling, or what do you do in this workspace?"
        value={businessDescription}
        onChange={onBusinessDescriptionChange}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((current: boolean) => !current)}
        placeholder="e.g. I sell enterprise security software to mid-market IT teams."
      />
    </div>
  );
}
