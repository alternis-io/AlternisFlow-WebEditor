import React, { useRef, useState } from "react";
import styles from "./Ide.module.css";
import { ParticipantEditor } from "./ParticipantEditor";
import { GenericEditor } from "./GenericEditor";

const dataPanes = {
  participants: {
    // FIXME: i18n
    label: "Participants",
    component: ParticipantEditor,
  },
  gates: {
    label: "Gates",
    component: () => <GenericEditor
      newInitialVal={{ initial: "locked" }}
      singularEntityName="gate"
      docPropKey="gates"
      extraActions={useRef(({ data, set }) => (
        <input
          title={`Starts ${data.initial}`}
          checked={data.initial === "locked"}
          // NOTE: use custom checkbox with lock symbol
          type="checkbox"
          onChange={() => set({ initial: data.initial === "locked" ? "unlocked" : "locked" })}
        />
      )).current}
    />
  },
  constants: {
    label: "Constants",
    component: () => <GenericEditor
      newInitialVal={{ type: "string", default: "value" }}
      singularEntityName="constant"
      docPropKey="constants"
      // FIXME: make these inline components typed...
      extraActions={useRef(({ data, set }) => (
        <input
          title="default"
          value={data.default}
          onChange={(e) => set({ default: e.currentTarget.value })}
        />
      )).current}
    />
  },
  events: {
    label: "Events",
    component: () => <GenericEditor
      newInitialVal={{}}
      singularEntityName="event"
      docPropKey="events"
    />
  },
} as const;

type DataPanes = keyof typeof dataPanes;
type DataPane = (typeof dataPanes)[DataPanes];

export function ProjectDataEditor(_props: ProjectDataEditor.Props) {
  const [openDataPane, setOpenDataPane] = useState<DataPanes>("participants");
  const PaneComponent = dataPanes[openDataPane].component;

  return (
    <div className={styles.projectDataEditor}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 11,
      }}>
        {(Object.entries(dataPanes) as [DataPanes, DataPane][]).map(([name, data]) => (
          <span
            key={name}
            className="hoverable"
            onClick={() => setOpenDataPane(name)}
            style={{
              borderBottom: "1px solid var(--fg-1)",
              fontWeight: name === openDataPane ? "bold" : "normal",
            }}
          >
            {data.label}
          </span>
        ))}
      </div>
      <br />
      <PaneComponent />
    </div>
  );
}

export namespace ProjectDataEditor {
  export interface Props {}
}

