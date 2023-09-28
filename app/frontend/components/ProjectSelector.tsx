import React, { useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useAsyncEffect, useAsyncInterval, useOnExternalClick } from "@bentley/react-hooks";
import type { DocumentList } from "dialogue-middleware-app-backend/lib/prisma";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import * as styles from "./ProjectSelector.module.css";
import { ContextMenuOptions } from "./ContextMenu";
import { useRedirectIfNotLoggedIn } from "../hooks/useRedirectIfNotLoggedIn";

function ProjectTile(props: {
  doc: DocumentList[number],
  onSelectProject: ProjectSelector.Props["onSelectProject"],
}) {
  const updateDocument = useApi(s => s.api.updateDocument);
  const deleteDocument = useApi(s => s.api.deleteDocument);

  const [showMore, setShowMore] = useState(false);

  return (
    <div
      key={props.doc.name}
      onClick={() => {
        props.onSelectProject(props.doc.name);
      }}
      {...classNames("hoverable")}
      style={{
        padding: 22,
        minHeight: "25vh",
        borderRadius: 15,
        border: "1px solid var(--fg-1)",
      }}
    >
      <Center>
        <span
          contentEditable
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
              if (e.currentTarget.innerText.trim() === "")
                e.currentTarget.innerText = "invalid name"
            }
          }}
          onBlur={(e) => updateDocument(props.doc.id, { name: e.currentTarget.innerText.trim() || "invalid name"})}
        >
          {props.doc.name}
        </span>
      </Center>
      <div>
        <span className="hoverable" onClick={() => setShowMore(p => !p)}>
          ...
        </span>
        {showMore && <ContextMenuOptions options={[{
          id: "delete",
          label: "Delete this project",
          onSelect: () => deleteDocument(props.doc.id),
        }]} />}
      </div>
    </div>
  );
}

export function ProjectSelector(props: ProjectSelector.Props) {
  const documents = useApi(s => s.documents);
  const syncMyRecentDocuments = useApi(s => s.api.syncMyRecentDocuments);
  const createDocument = useApi(s => s.api.createDocument);
  const [createDocDialogShown, setCreateDocDialogShown] = React.useState(false);

  // FIXME: add run immediately to useAsyncInterval?
  useAsyncEffect(async () => {
    await syncMyRecentDocuments();
  }, []);

  const _10min = 10 * 60 * 1000;
  useAsyncInterval(async () => {
    await syncMyRecentDocuments();
  }, _10min);

  const dialogRef = useRef<HTMLDialogElement>(null);
  useOnExternalClick(dialogRef, () => setCreateDocDialogShown(false));

  return (
    <div style={{ padding: 11 }}>
      <h1>Projects</h1>
      <dialog open={createDocDialogShown} ref={dialogRef}>
        <h2> Create a project </h2>
        <h5> Clone from an existing one </h5>
        <div style={{ overflow: "scroll", maxHeight: "50vh" }}>
          {documents?.map(d => (
            // FIXME: this should use a special backend call
            <div
              onClick={() => {
                void createDocument();
                setCreateDocDialogShown(false);
              }}
              className="hoverable"
            >
              <span>{d.name}</span>
            </div>
          )) ?? <span><em>You have no documents to clone</em></span>}
        </div>
        <h5> Or create an empty one </h5>
        <Center>
          <button onClick={() => {
            void createDocument();
            setCreateDocDialogShown(false);
          }}>
            Create empty
          </button>
        </Center>
      </dialog>
      <div className={styles.projectGrid}>
        <div
          {...classNames("newButton", "hoverable")}
          title="Make a new project with the new project wizard"
          onClick={() => setCreateDocDialogShown(true)}
          style={{
            padding: 22,
            minHeight: "25vh",
            borderRadius: 15,
          }}
        >
          <Center><strong><em>Create a new project</em></strong></Center>
        </div>
        {documents?.map((d) => (
          <ProjectTile onSelectProject={props.onSelectProject} doc={d} />
        ))}
      </div>
    </div>
  );
}

namespace ProjectSelector {
  export interface Props {
    onSelectProject(project: string): void;
  }
}

export default ProjectSelector;
