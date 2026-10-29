"use client";

import { useEffect, useState } from "react";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import { AgentNav } from "./children/AgentNav/AgentNav";
import { AgentEditor } from "./children/AgentEditor/AgentEditor";
import { FAKE_AGENTS, type AgentFields, type AgentVersion, type CoachAgent } from "./Agents.data";
import { makeVersion } from "./Agents.script";
import position from "./Agents.position.module.css";
import styles from "./Agents.styles.module.css";

function makeDraftAgent(): CoachAgent {
  return {
    id: crypto.randomUUID(),
    name: "",
    nickname: "",
    nicknameLocked: false,
    description: "",
    instructions: "",
    photoUrl: null,
    knowledgeFiles: [],
  };
}

export function Agents() {
  const { setBrand } = useHeaderActions();
  const [agents, setAgents] = useState<CoachAgent[]>(FAKE_AGENTS);
  const [selectedId, setSelectedId] = useState<string | null>(FAKE_AGENTS[0]?.id ?? null);
  const [versionsByAgent, setVersionsByAgent] = useState<Record<string, AgentVersion[]>>({});

  const selected = agents.find((agent) => agent.id === selectedId) ?? null;

  useEffect(() => {
    setBrand({ label: "Agents", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  function handleAddAgent() {
    const draft = makeDraftAgent();
    setAgents((current) => [...current, draft]);
    setSelectedId(draft.id);
  }

  function handleSave(agentId: string, fields: AgentFields) {
    setAgents((current) => current.map((agent) => (agent.id === agentId ? { id: agentId, ...fields } : agent)));
    setVersionsByAgent((current) => {
      const previous = current[agentId] ?? [];
      return { ...current, [agentId]: [...previous, makeVersion(previous, fields)] };
    });
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <AgentNav agents={agents} selectedId={selectedId} onSelect={setSelectedId} onAddAgent={handleAddAgent} />
      {selected ? (
        <AgentEditor
          key={selected.id}
          agent={selected}
          versions={versionsByAgent[selected.id] ?? []}
          onSave={(fields) => handleSave(selected.id, fields)}
        />
      ) : (
        <div className={position.emptyState} data-construction>
          <span className={styles.emptyHeading} data-construction>
            No agents yet
          </span>
          <span className={styles.emptyBody} data-construction>
            Create your first agent to get started.
          </span>
        </div>
      )}
    </div>
  );
}
