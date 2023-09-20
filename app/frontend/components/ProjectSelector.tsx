import React from "react";
import { useApi } from "../hooks/useApi";
import { defaultAppState, useAppState } from "../AppState";
import { useAsyncEffect } from "@bentley/react-hooks";
import type { Document } from "dialogue-middleware-app-backend/lib/prisma";
import { Center } from "../Center";
import { classNames } from "../react-utils";

export function ProjectSelector(props: ProjectSelector.Props) {
  const api = useApi();

  // FIXME: use a separate store for this stuff locally?
  const [projectsList, setProjectsList] = React.useState<Document[]>();
  console.log(projectsList);

  useAsyncEffect(async ({ isStale }) => {
    const result = await api.getMyDocumentList().then(r => r.json());
    if (!isStale())
      setProjectsList(result);
  }, []);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 300px))",
      gridAutoRows: `fit-content`,
      gap: 22,
    }}>
      {projectsList?.map((project) => (
        <div
          key={project.name}
          onClick={() => {
            props.onSelectProject(project);
          }}
          style={{
            padding: 22,
            minHeight: "25vh",
          }}
        >
          <Center>
            {project.name}
          </Center>
        </div>
      ))}
      <div
        {...classNames("newButton", "hoverable")}
        onClick={() => {
          api.createDocument({
            id: `id_${Math.random()}`,
            name: `name_${Math.random()}`,
            jsonContents: JSON.stringify(defaultAppState),
          });
        }}
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
