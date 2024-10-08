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
          {data.type === "boolean" ? (
            <input
              type="checkbox"
              value={data.default}
              // FIXME: should not be string
              onChange={e => set({ default: String(e.currentTarget.checked) })}
              title={`The initial value for this variable when the dialogue begins (${data.default})`}
            />
          ) : (
            <input
              // WTF: no idea how this works
              style={{ minWidth: "40%", width: "100%", flex: 0 }}
              value={data.default}
              onChange={e => set({ default: e.currentTarget.value })}
              onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
              title="The initial value for this variable when the dialogue begins"
            />
          )}
          <select
            value={data.type}
            onChange={(e) => {
              assert(e.currentTarget.value === "string" || e.currentTarget.value === "boolean");
              set({ type: e.currentTarget.value });
            }}
          >
            <option
              value="boolean"
              title="A variable which is true or false, can be used to make lock conversations"
            >
              true/false
            </option>
            <option
              value="string"
              title="A variable which can be any text, can be used in reply and line nodes"
            >
              text
            </option>
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
        disallowDeleteLast={true}
        onClickEntryName={(key) => useAppState.setState({ currentDialogueId: key })}
        onRename={(_oldName, newName) => {
          // FIXME: this is out of sync with the pouchdb update...
          useAppState.setState({
            currentDialogueId: newName,
          });
        }}
        data-tut-id="dialogues-content"
        onAdd={(key) => useAppState.setState({ currentDialogueId: key })}
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

