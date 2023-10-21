import React, { useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useAsyncEffect, useAsyncInterval, useOnExternalClick } from "@bentley/react-hooks";
import type { DocumentList } from "dialogue-middleware-app-backend/lib/prisma";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import * as styles from "./ProjectSelector.module.css";
import { ContextMenuOptions } from "./ContextMenu";
import { AppState } from "../AppState";

import template1 from "../templates/template1.json";
const templates: Record<string, AppState["document"]> = {
  template1,
  empty: { name: "Empty", nodes: [], edges: [], participants: [], functions: {}, variables: {} },
};

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
      {...classNames("alternis__hoverable")}
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
        <span className="alternis__hoverable" onClick={() => setShowMore(p => !p)}>
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

  const ifEmptyDefault = <T,>(arr: T[] | undefined, _default: T): T[] =>
    !arr || arr.length === 0 ? [_default] : arr;

  return (
    <div style={{ padding: 11 }}>
      <h1>Projects</h1>
      <dialog open={createDocDialogShown} ref={dialogRef}>
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
            <span><em>You have no templates to clone</em></span>
          )}
        </div>
        <h5> Or clone from an existing one </h5>
        <div style={{ overflow: "scroll", maxHeight: "50vh" }}>
          {ifEmptyDefault(
            documents?.map(d => (
              // FIXME: this should use a special backend call
              <div
                onClick={() => {
                  void createDocument();
                  setCreateDocDialogShown(false);
                }}
                className="alternis__hoverable"
              >
                <span>{d.name}</span>
              </div>
            )),
            <span><em>You have no documents to clone</em></span>
          )}
        </div>
      </dialog>
      <div className={styles.projectGrid}>
        <div
          {...classNames("alternis__newButton", "alternis__hoverable")}
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
