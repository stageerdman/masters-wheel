"use client";

import { useEffect, useState } from "react";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import { listAgents, makeVersion, saveAgent, appendVersion, listVersions, type AgentFields, type AgentVersion, type Agent } from "@/lib/agents";
import { AgentNav } from "./children/AgentNav/AgentNav";
import { AgentEditor } from "./children/AgentEditor/AgentEditor";
import position from "./Agents.position.module.css";
import styles from "./Agents.styles.module.css";

function makeDraftAgent(): Agent {
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versionsByAgent, setVersionsByAgent] = useState<Record<string, AgentVersion[]>>({});

  const selected = agents.find((agent) => agent.id === selectedId) ?? null;

  useEffect(() => {
    setBrand({ label: "Agents", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  // Loads every agent actually saved to disk once, on mount — a freshly
  // added-but-never-saved draft only ever lives in local state (see
  // handleAddAgent below), so this never needs to run again mid-session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await listAgents();
      if (cancelled) return;
      setAgents(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setIsLoading(false);
      const versionsEntries = await Promise.all(loaded.map(async (agent) => [agent.id, await listVersions(agent.id)] as const));
      if (cancelled) return;
      setVersionsByAgent(Object.fromEntries(versionsEntries));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAddAgent() {
    const draft = makeDraftAgent();
    setAgents((current) => [...current, draft]);
    setSelectedId(draft.id);
  }

  async function handleSave(agentId: string, fields: AgentFields) {
    setAgents((current) => current.map((agent) => (agent.id === agentId ? { id: agentId, ...fields } : agent)));
    await saveAgent(agentId, fields);
    const previous = versionsByAgent[agentId] ?? [];
    const version = makeVersion(previous, fields);
    await appendVersion(agentId, version);
    setVersionsByAgent((current) => ({ ...current, [agentId]: [...previous, version] }));
  }

  if (isLoading) return null;

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
