import React from "react";
import styles from "./Ide.module.css"; // FIXME: use separate file
import { persistentData } from "./AppPersistentState";

export function DialogueViewer(props: DialogueViewer.Props) {
  return <div className={styles.textEditor}>
    <div>speaker</div>
    <div>speaker detail</div>
    <div>description</div>
    <div>option1</div>
    <div>option2</div>
    <div>option3</div>
    <div>option4</div>
  </div>;
}

export namespace DialogueViewer {
  export interface Props {}
}
