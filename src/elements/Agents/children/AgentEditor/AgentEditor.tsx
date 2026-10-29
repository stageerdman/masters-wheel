"use client";

import { useState } from "react";
import type { AgentFields, AgentVersion, CoachAgent } from "@/elements/Agents/Agents.data";
import { useAgentDraft } from "./AgentEditor.script";
import { IdentityHeader } from "./children/IdentityHeader/IdentityHeader";
import { InstructionsField } from "./children/InstructionsField/InstructionsField";
import { KnowledgeManager } from "./children/KnowledgeManager/KnowledgeManager";
import { SaveButton } from "./children/SaveButton/SaveButton";
import { VersionHistoryPanel } from "./children/VersionHistoryPanel/VersionHistoryPanel";
import position from "./AgentEditor.position.module.css";
import styles from "./AgentEditor.styles.module.css";

type AgentEditorProps = {
  agent: CoachAgent;
  versions: AgentVersion[];
  onSave: (fields: AgentFields) => void;
};

export function AgentEditor({ agent, versions, onSave }: AgentEditorProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    draft,
    dirty,
    rootRef,
    setName,
    setNickname,
    setDescription,
    setInstructions,
    handleFocusField,
    handleBlurField,
    setPhoto,
    addKnowledgeFile,
    removeKnowledgeFile,
    restore,
    save,
  } = useAgentDraft(agent, onSave);

  function handleRestore(version: AgentVersion) {
    if (dirty) {
      const confirmed = window.confirm("Discard unsaved changes and load this version? Your current edits aren't saved.");
      if (!confirmed) return;
    }
    restore(version.fields);
    setHistoryOpen(false);
  }

  return (
    <div ref={rootRef} className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.main} data-construction>
        <div className={position.toolbar} data-construction>
          <button
            type="button"
            className={`${styles.historyButton} ${position.historyButton} ${historyOpen ? styles.historyButtonActive : ""}`}
            data-construction
            onClick={() => setHistoryOpen((open) => !open)}
            aria-pressed={historyOpen}
          >
            Version History
          </button>
          <SaveButton dirty={dirty} onSave={save} />
        </div>
        <IdentityHeader
          name={draft.name}
          nickname={draft.nickname}
          description={draft.description}
          photoUrl={draft.photoUrl}
          onNameChange={setName}
          onNicknameChange={setNickname}
          onDescriptionChange={setDescription}
          onPhotoChange={setPhoto}
          onFieldFocus={handleFocusField}
          onFieldBlur={handleBlurField}
        />
        <InstructionsField
          value={draft.instructions}
          knowledgeFiles={draft.knowledgeFiles}
          onChange={setInstructions}
          onFocus={handleFocusField}
          onBlur={handleBlurField}
        />
        <KnowledgeManager files={draft.knowledgeFiles} onAddFile={addKnowledgeFile} onRemoveFile={removeKnowledgeFile} />
      </div>
      <VersionHistoryPanel isOpen={historyOpen} versions={versions} onRestore={handleRestore} />
    </div>
  );
}
