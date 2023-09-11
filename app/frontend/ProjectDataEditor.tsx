import React from "react";
import styles from "./Ide.module.css"; // FIXME: use separate file
import { persistentData } from "./AppPersistentState";
import { ParticipantEditor } from "./ParticipantEditor";

export function ProjectDataEditor(_props: ProjectDataEditor.Props) {
  return (
    <div className={styles.textEditor}>
      <ParticipantEditor />
    </div>
  );
}

export namespace ProjectDataEditor {
  export interface Props {}
}

