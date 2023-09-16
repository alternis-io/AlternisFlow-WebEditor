import React, { useState } from "react";
import styles from "./Ide.module.css"; // FIXME: use separate file
import { ParticipantEditor } from "./ParticipantEditor";

const dataPanes = {
  participants: {
    // FIXME: i18n
    label: "Participants",
    component: ParticipantEditor,
  },
  gates: {
    label: "Gates",
    component: () => null,
  },
  constants: {
    label: "Constants",
    component: () => null,
  },
  events: {
    label: "Events",
    component: () => null,
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
      <PaneComponent />
    </div>
  );
}

export namespace ProjectDataEditor {
  export interface Props {}
}

