import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { useAppState } from "./AppState";

const router = createHashRouter([
  {
    path: "/",
    element: (
      <ReactFlowProvider>
        <Ide />
      </ReactFlowProvider>
    ),
  },
  {
    path: "/documents",
    element: (
      <ProjectSelector
        onSelectProject={(projectId) => useAppState.setState({ projectId })
      }
      />
    ),
  }
]);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.querySelector("#react-app")
);
