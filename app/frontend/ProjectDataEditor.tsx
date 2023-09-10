import React from "react";
import styles from "./Ide.module.css"; // FIXME: use separate file
import { persistentData } from "./AppPersistentState";

export function ProjectDataEditor(_props: ProjectDataEditor.Props) {
  return <div className={styles.textEditor}>
    <div>
      tabs
      <span>speakers</span>
      <span>states</span>
    </div>
    <div>
      <span>speaker</span>
      <div>portrait</div>
      <div>name</div>
    </div>
  </div>;
}

export namespace ProjectDataEditor {
  export interface Props {}
}
