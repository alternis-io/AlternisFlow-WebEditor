import React, { useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useAsyncEffect, useAsyncInterval, useOnExternalClick } from "@bentley/react-hooks";
import type { DocumentList } from "dialogue-middleware-app-backend/lib/prisma";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import * as styles from "./ProjectSelector.module.css";
import { MoreMenu } from "./ContextMenu";
import { Document, defaultAppState } from "../AppState";

import template1 from "../templates/template1.json";

const templates: Record<string, Omit<Document, "id">> = {
  template1,
  empty: structuredClone(defaultAppState.document),
};

function ProjectTile(props: {
  doc: DocumentList[number],
  onSelectProject: ProjectSelector.Props["onSelectProject"],
}) {
  const updateDocumentMeta = useApi(s => s.api.updateDocumentMeta);
  const deleteDocument = useApi(s => s.api.deleteDocument);
  const duplicateDocument = useApi(s => s.api.duplicateDocument);

  const editableRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    if (editableRef.current)
      editableRef.current.textContent = props.doc.name;
  }, []);

  return (
    <div
      key={props.doc.name}
      onClick={() => {
        props.onSelectProject(props.doc.name);
      }}
      {...classNames("alternis__hoverable", styles.projectTile)}
    >
      <Center>
        <span
          contentEditable
          onClick={(e) => {
            // don't select the project when clicking this
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
              if (e.currentTarget.innerText.trim() === "")
                e.currentTarget.innerText = "invalid name"
            }
          }}
          onBlur={(e) => {
            const newName = e.currentTarget.innerText.trim() || "invalid name";
            updateDocumentMeta(props.doc.id, { name: newName });
          }}
          ref={editableRef}
        />
      </Center>
      <div onClick={e => e.stopPropagation()}>
        <MoreMenu
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
          }}
          options={[
            {
              id: "duplicate-project",
              onSelect: () => duplicateDocument(props.doc),
              label: "Duplicate this project",
            },
            {
              id: "delete-project",
              // FIXME: this should be confirmed and a soft delete!
              onSelect: () => deleteDocument(props.doc.id),
              label: "Delete this project",
            },
          ]}
        />
      </div>
    </div>
  );
}

export function ProjectSelector(props: ProjectSelector.Props) {
  const documents = useApi(s => s.documents);
  const syncMyRecentDocuments = useApi(s => s.api.syncMyRecentDocuments);
  const createDocument = useApi(s => s.api.createDocument);
  const duplicateDocument = useApi(s => s.api.duplicateDocument);
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

  const ifEmptyDefault = <T,>(arr: T[] | undefined, _default: T): T[] =>
    !arr || arr.length === 0 ? [_default] : arr;

  const newProjectDialog = (
    <dialog className={styles.newProjectDialog} open={createDocDialogShown} ref={dialogRef}>
      <h2> Create a project </h2>
      <h5> Use a template </h5>
      <div style={{ overflow: "scroll", maxHeight: "50vh" }}>
        {ifEmptyDefault(
          Object.values(templates)?.map(t => (
            <div
              key={t.name}
              onClick={() => {
                void createDocument(t);
                setCreateDocDialogShown(false);
              }}
              className="alternis__hoverable"
            >
              <span>{t.name}</span>
            </div>
          )),
          <span key="none"><em>You have no templates to clone</em></span>
        )}
      </div>
      <h5> Or clone from an existing one </h5>
      <div style={{ overflow: "scroll", maxHeight: "50vh" }}>
        {ifEmptyDefault(
          documents?.map(d => (
            <div
              key={d.id}
              onClick={() => {
                void duplicateDocument(d);
                setCreateDocDialogShown(false);
              }}
              className="alternis__hoverable"
            >
              <span>{d.name}</span>
            </div>
          )),
          <span key="none"><em>You have no documents to clone</em></span>
        )}
      </div>
    </dialog>
  );

  return (
    <div style={{ padding: 11 }}>
      <h1>Projects</h1>
      <div className={styles.projectGrid}>
        <div
          {...classNames("alternis__newButton", "alternis__hoverable", styles.projectTile)}
          title="Make a new project with the new project wizard"
          onClick={() => setCreateDocDialogShown(true)}
        >
          <Center><strong><em>Create a new project</em></strong></Center>
        </div>
        {documents?.map((d) => (
          <ProjectTile key={d.id} onSelectProject={props.onSelectProject} doc={d} />
        ))}
      </div>
      {newProjectDialog}
    </div>
  );
}

namespace ProjectSelector {
  export interface Props {
    onSelectProject(project: string): void;
  }
}

export default ProjectSelector;
