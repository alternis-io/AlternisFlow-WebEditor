import React, { useContext, useEffect, useRef, useState } from "react";
import TestGraphEditor from "./TestGraphEditor";
import styles from "./Ide.module.css";
import { DialogueViewer } from "./DialogueViewer";
import { ProjectDataEditor } from "./ProjectDataEditor";

// FIXME: use vite feature to get port from env
const apiBaseUrl = "http://localhost:3001"

export function Ide(_props: Ide.Props) {
  return (
    <div className={styles.split}>
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
