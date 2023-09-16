import React from "react";
import TestGraphEditor from "./TestGraphEditor";
import styles from "./Ide.module.css";
import { DialogueViewer } from "./DialogueViewer";
import { ProjectDataEditor } from "./ProjectDataEditor";
import { Split } from "./Split";
import { resetAllAppState, useAppState } from "./AppState";
import downloadFile, { uploadFile } from "./localFileManip";

// FIXME: use vite feature to get port from env
const apiBaseUrl = "http://localhost:3001"

function Header() {
  return <Split
    style={{
      boxShadow: "black 0 0 5px",
    }}
    right={
      <div style={{
        display: "flex",
        gap: 11,
        padding: 5,
      }}
      >
        <button>Feedback</button>
        <button
          onClick={() => {
            downloadFile({
              fileName: 'doc.name.json',
              content: JSON.stringify(useAppState.getState().document, undefined, "  "),
            });
          }}
        >
          Export
        </button>
        <button
          onClick={async () => {
            const file = await uploadFile({ type: 'text' })
            const json = JSON.parse(file.content)
            // FIXME: validate state!
            useAppState.setState(json);
          }}
        >
          Import
        </button>
        <button
          onClick={async () => {
            resetAllAppState();
          }}
        >
          Reset
        </button>
      </div>
    }
  />;
}

export function Ide(_props: Ide.Props) {
  return (
    <div>
      <Header />
      <div className={styles.split}>
        <ProjectDataEditor />
        {/*<DialogueViewer />*/}
        <span className={styles.graphEditor}>
          <TestGraphEditor />
        </span>
      </div>
    </div>
  );
}

namespace Ide {
  export interface Props {}
}

export default Ide;
