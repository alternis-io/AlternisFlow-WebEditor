import React, { useLayoutEffect } from "react";
import TestGraphEditor from "./TestGraphEditor";
import styles from "./Ide.module.css";
import { DialogueViewer } from "./DialogueViewer";
import { ProjectDataEditor } from "./ProjectDataEditor";
import { useAppState, useTemporalAppState } from "./AppState";
import { Header } from "./components/Header";

export function Ide(_props: Ide.Props) {
  const redo = useTemporalAppState(s => s.redo);
  const undo = useTemporalAppState(s => s.undo);

  // FIXME: insertion effect?
  useLayoutEffect(() => {
    const ctrlZUndo = (e: KeyboardEvent) => {
      // FIXME: use code not string
      if (e.key.toLowerCase() === "z" && e.ctrlKey) undo();
    };
    const ctrlShiftZRedo = (e: KeyboardEvent) => {
      if (e.key === "Z" && e.ctrlKey && e.shiftKey) redo();
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
    <div className={styles.split} style={{ height: "calc(100vh - 31.25px)"}}>
      <ProjectDataEditor />
      {/*<DialogueViewer />*/}
      <span className={styles.graphEditor}>
        <TestGraphEditor />
      </span>
    </div>
  );
}

namespace Ide {
  export interface Props {}
}

export default Ide;
