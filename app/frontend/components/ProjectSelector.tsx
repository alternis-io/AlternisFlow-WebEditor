import React from "react";
import { useApi } from "../hooks/useApi";
import { defaultAppState, useAppState } from "../AppState";
import { useAsyncEffect, useAsyncInterval } from "@bentley/react-hooks";
import type { Document } from "dialogue-middleware-app-backend/lib/prisma";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";

export function ProjectSelector(props: ProjectSelector.Props) {
  const documents = useApi(s => s.documents);
  const syncMyRecentsDocuments = useApi(s => s.api.syncMyRecentsDocuments);
  const createDocument = useApi(s => s.api.createDocument);

  const _10min = 10 * 60 * 1000;

  useAsyncInterval(async () => {
    await syncMyRecentsDocuments();
  }, _10min);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 300px))",
      gridAutoRows: `fit-content`,
      gap: 22,
    }}>
      {documents?.map((d) => (
        <div
          key={d.name}
          onClick={() => {
            props.onSelectProject(d.name);
          }}
          style={{
            padding: 22,
            minHeight: "25vh",
          }}
        >
          <Center>
            <span
              contentEditable
              onBlur={(e) => useApi.setState((s) => ({
                documents: s.documents?.map((dd) =>
                  d.id !== dd.id
                  ? dd
                  : { ...dd, name: e.currentTarget.innerText }
                ),
              }))}
            >
              {d.name}
            </span>
          </Center>
        </div>
      ))}
      <div
        {...classNames("newButton", "hoverable")}
        onClick={() => createDocument()}
        style={{
          padding: 22,
          minHeight: "25vh",
        }}
      >
        <Center>+</Center>
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
