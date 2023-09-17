import React, { useRef, useState } from "react";
import styles from "./Ide.module.css";
import { ParticipantEditor } from "./ParticipantEditor";
import { GenericEditor } from "./GenericEditor";

const dataPanes = {
  participants: {
    // FIXME: i18n
    label: "Participants",
    component: ParticipantEditor,
    desc: "Add, remove and edit participants of the dialogue",
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
  variables: {
    label: "Variables",
    component: () => <GenericEditor
      newInitialVal={{ type: "string", default: "value" }}
      singularEntityName="variable"
      docPropKey="variables"
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
  settings: {
    label: "Preferences",
    component: () => {
      return (
        <div>
          <label title="Which (mouse) button you can click and drag to start a box selection of graph elements" className="split">
            <span>
              Drag select nodes button
            </span>
            <select value="none">
              <option value="middle-mouse">middle mouse drag</option>
              <option value="left-mouse">left mouse drag</option>
              <option value="right-mouse">right mouse drag</option>
              <option value="none">none</option>
            </select>
          </label>
          <label title="Which (mouse) button you can click and drag to move around the graph" className="split">
            <span>
              Pan graph button
            </span>
            <select value="left-mouse">
              <option value="middle-mouse">middle mouse drag</option>
              <option value="left-mouse">left mouse drag</option>
              <option value="right-mouse">right mouse drag</option>
              <option value="none">none</option>
            </select>
          </label>
        </div>
      );
    }
  }
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

