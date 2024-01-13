import React, { useRef, useState } from "react";
import styles from "./Ide.module.css";
import { ParticipantEditor } from "./ParticipantEditor";
import { GenericEditor } from "./GenericEditor";
import { Preferences } from "./components/Preferences";
import { assert } from "js-utils/lib/browser-utils";
import { defaultDialogue, useAppState } from "./AppState";

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
      extraActions={useRef<GenericEditor.Props<"variables">["extraActions"]>(({ data, set }) => (
        <>
          <select
            value={data.type}
            onChange={(e) => {
              assert(e.currentTarget.value === "string" || e.currentTarget.value === "boolean");
              set({ type: e.currentTarget.value });
            }}
          >
            <option value="boolean" title="true/false">true/false</option>
            <option value="string" title="text">text</option>
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
      return <Preferences />;
    },
    desc: "Editor preferences",
  },
  dialogues: {
    label: "Dialogues",
    component: () => (
      <GenericEditor
        newInitialVal={() => structuredClone(defaultDialogue)}
        singularEntityName="dialogue"
        docPropKey="dialogues"
        noDrag
        onClick={(key) => useAppState.setState({ currentDialogueId: key })}
      />
    ),
    desc: "Choose dialogues from this project to edit."
  },
} as const;

type DataPanes = keyof typeof dataPanes;
type DataPane = (typeof dataPanes)[DataPanes];

// HACK: expose the setter for the tutorial. There should only ever be one of this component...
// a context or even zustand store would probably be better
export let setOpenDataPane: (d: DataPanes | ((d: DataPanes) => DataPanes)) => void;

export function ProjectDataEditor(_props: ProjectDataEditor.Props) {
  let openDataPane: DataPanes;
  ([openDataPane, setOpenDataPane] = useState<DataPanes>("participants"));
  const PaneComponent = dataPanes[openDataPane].component;

  return (
    <div
      className={styles.projectDataEditor}
      data-tut-id="project-data-editor"
      data-tut-inset
    >
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "calc(2 * var(--gap))",
      }}>
        {(Object.entries(dataPanes) as [DataPanes, DataPane][]).map(([name, data]) => (
          <span
            title={data.desc}
            key={name}
            className="alternis__hoverable"
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

