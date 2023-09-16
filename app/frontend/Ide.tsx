import React, { useLayoutEffect } from "react";
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
        // 31.25px
        gap: 11,
        padding: 5,
      }}
      >
        <button>Newsletter</button>
        <button>Feedback</button>
        <button>Search</button>
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
  const redo = useAppState(s => s.redo);
  const undo = useAppState(s => s.undo);

  useLayoutEffect(() => {
    const ctrlZUndo = (e: KeyboardEvent) => {
      // FIXME: use code not string
      if (e.key.toLowerCase() === "z" && e.ctrlKey) undo();
    };
    const ctrlShiftZRedo = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "z" && e.ctrlKey && e.shiftKey) redo();
    };
    const ctrlYRedo = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "y" && e.ctrlKey) redo();
    };

    document.addEventListener("keydown", ctrlZUndo);
    document.addEventListener("keydown", ctrlShiftZRedo);
    document.addEventListener("keydown", ctrlYRedo);

    return () => {
      document.removeEventListener("keydown", ctrlZUndo);
      document.removeEventListener("keydown", ctrlShiftZRedo);
      document.removeEventListener("keydown", ctrlYRedo);
    };
  });

  return (
    <div>
      <Header />
      <div className={styles.split} style={{ height: "calc(100vh - 31.25px)"}}>
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
