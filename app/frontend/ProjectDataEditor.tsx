import React, { useState } from "react";
import styles from "./Ide.module.css";
import { ParticipantEditor } from "./ParticipantEditor";
import { GateEditor } from "./GateEditor";
import { GenericEditor } from "./EventEditor";

const dataPanes = {
  participants: {
    // FIXME: i18n
    label: "Participants",
    component: ParticipantEditor,
  },
  gates: {
    label: "Gates",
    component: GateEditor,
  },
  constants: {
    label: "Constants",
    component: () => <GenericEditor
      newInitialVal={{ type: "string" }}
      singularEntityName="constant"
      docPropKey="constants"
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
        {(Object.entries(dataPanes) as [DataPanes, DataPane][]) .map(([name, data]) => (
          <span
            onClick={() => setOpenDataPane(name)}
            style={{
              borderBottom: "1px solid var(--fg-1)",
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

