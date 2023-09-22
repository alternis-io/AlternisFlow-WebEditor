import React, { useRef, useState } from "react";
import styles from "./Ide.module.css";
import { ParticipantEditor } from "./ParticipantEditor";
import { GenericEditor } from "./GenericEditor";

const dataPanes = {
  participants: {
    // FIXME: i18n
    label: "Participants",
    component: ParticipantEditor,
    desc: "Edit participants of the dialogue",
  },
  variables: {
    label: "Variables",
    component: () => <GenericEditor
      newInitialVal={{ type: "boolean", default: "value" }}
      singularEntityName="variable"
      docPropKey="variables"
      extraActions={useRef(({ data, set }) => (
        <>
          <select
            value={data.type}
            onChange={(e) => {
              set({ type: e.currentTarget.value });
            }}
          >
            <option value="boolean" title="true/false">Boolean</option>
            <option value="number" title="number">Number</option>
            <option value="string" title="text">Text</option>
          </select>
        </>
        // // NOTE: afaict no need for a default value yet
        // <input
        //   title="default"
        //   value={data.default}
        //   onChange={(e) => set({ default: e.currentTarget.value })}
        // />
      )).current}
    />,
    desc: "Edit the variables in the dialogue.\n"
      + "Variables are values set at any time by the environment. "
      + "They can be anything, and you can use the syntax {{variable_name}} to refer to them in text."
  },
  functions: {
    label: "Functions",
    component: () => <GenericEditor
      newInitialVal={{}}
      singularEntityName="function"
      docPropKey="functions"
    />,
    desc: "Edit the functions in the dialogue.\n"
      + "Functions are callbacks into the environment that "
      + "can invoke custom functionality during a dialogue."
  },
  preferences: {
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
    },
    desc: "Editor preferences",
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
            title={data.desc}
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

