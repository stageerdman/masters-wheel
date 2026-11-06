"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import {
  listAgents,
  makeVersion,
  saveAgent,
  appendVersion,
  listVersions,
  deleteAgent,
  type AgentFields,
  type AgentVersion,
  type Agent,
} from "@/lib/agents";
import { useSpaces } from "@/lib/spaces";
import { AgentNav } from "./children/AgentNav/AgentNav";
import { AgentEditor } from "./children/AgentEditor/AgentEditor";
import { ContextMenu, type ContextMenuItem } from "@/elements/ContextMenu/ContextMenu";
import position from "./Agents.position.module.css";
import styles from "./Agents.styles.module.css";

type AgentContextMenuState = { agentId: string; x: number; y: number };

export function Agents() {
  const { setBrand } = useHeaderActions();
  const { spaces, activeSpace } = useSpaces();

  // A brand-new, unsaved agent lives in whichever Space it was created
  // from — and defaults to visible in every Space that currently exists,
  // same "universal unless narrowed down" default a legacy agent gets
  // (see src/lib/agents/storage.ts's parseAgent).
  function makeDraftAgent(): Agent {
    return {
      id: crypto.randomUUID(),
      homeSpaceId: activeSpace.id,
      homeSpaceFolder: activeSpace.folderName,
      name: "",
      nickname: "",
      nicknameLocked: false,
      description: "",
      instructions: "",
      photoUrl: null,
      knowledgeFiles: [],
      availableSpaceIds: spaces.map((space) => space.id),
    };
  }
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versionsByAgent, setVersionsByAgent] = useState<Record<string, AgentVersion[]>>({});
  const [agentContextMenu, setAgentContextMenu] = useState<AgentContextMenuState | null>(null);

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
    setAgents((current) => current.map((agent) => (agent.id === agentId ? { ...agent, ...fields } : agent)));
    await saveAgent(agentId, fields);
    const previous = versionsByAgent[agentId] ?? [];
    const version = makeVersion(previous, fields);
    await appendVersion(agentId, version);
    setVersionsByAgent((current) => ({ ...current, [agentId]: [...previous, version] }));
  }

  function handleContextMenuAgent(event: MouseEvent, agentId: string) {
    event.preventDefault();
    setAgentContextMenu({ agentId, x: event.clientX, y: event.clientY });
  }

  async function handleDeleteAgent(agentId: string) {
    const agent = agents.find((candidate) => candidate.id === agentId);
    const confirmed = await confirm(`Delete "${agent?.name || "this agent"}"? This can't be undone.`, {
      title: "Delete agent",
      kind: "warning",
    });
    if (!confirmed) return;

    // A draft that was never saved has no folder on disk at all — every
    // saved agent has a versionsByAgent entry (populated on load, or by
    // the first handleSave), so this is enough to tell the two apart.
    if (versionsByAgent[agentId] !== undefined) await deleteAgent(agentId);

    setAgents((current) => current.filter((agent) => agent.id !== agentId));
    setVersionsByAgent((current) => {
      const next = { ...current };
      delete next[agentId];
      return next;
    });
    setSelectedId((current) => {
      if (current !== agentId) return current;
      const remaining = agents.filter((agent) => agent.id !== agentId);
      return remaining[0]?.id ?? null;
    });
  }

  if (isLoading) return null;

  const contextMenuItems: ContextMenuItem[] = agentContextMenu
    ? [
        {
          id: "remove",
          label: "Remove",
          destructive: true,
          onSelect: () => handleDeleteAgent(agentContextMenu.agentId),
        },
      ]
    : [];

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <AgentNav
        agents={agents}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAddAgent={handleAddAgent}
        onContextMenuAgent={handleContextMenuAgent}
      />
      {agentContextMenu && (
        <ContextMenu
          x={agentContextMenu.x}
          y={agentContextMenu.y}
          items={contextMenuItems}
          onClose={() => setAgentContextMenu(null)}
        />
      )}
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
