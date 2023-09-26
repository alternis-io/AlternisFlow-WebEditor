import React, { useRef } from "react";
import { useApi } from "../hooks/useApi";
import { defaultAppState, useAppState } from "../AppState";
import { useAsyncEffect, useAsyncInterval, useOnExternalClick } from "@bentley/react-hooks";
import type { Document } from "dialogue-middleware-app-backend/lib/prisma";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import * as styles from "./ProjectSelector.module.css";

export function ProjectSelector(props: ProjectSelector.Props) {
  const documents = useApi(s => s.documents);
  const syncMyRecentDocuments = useApi(s => s.api.syncMyRecentDocuments);
  const createDocument = useApi(s => s.api.createDocument);
  const updateDocument = useApi(s => s.api.updateDocument);
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
          <div
            key={d.name}
            onClick={() => {
              props.onSelectProject(d.name);
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
                  if (e.key === "Enter" && e.currentTarget.innerText !== "") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => updateDocument(d.id, { name: e.currentTarget.innerText })}
              >
                {d.name}
              </span>
            </Center>
          </div>
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
