import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { useAppState } from "./AppState";
import Header from "./components/Header";
import { LoginState } from "./components/LoginPage";
import { RedirectIfNotLoggedIn } from "./hooks/useRedirectIfNotLoggedIn";

// FIXME: try hash router
const router = createHashRouter([
  {
    path: "/",
    element: <>
      <RedirectIfNotLoggedIn />
      <Header />
      <ReactFlowProvider><Ide /></ReactFlowProvider>
    </>,
  },
  {
    path: "/documents",
    element: <>
      <RedirectIfNotLoggedIn />
      <Header />
      <ProjectSelector
        onSelectProject={(projectId) => useAppState.setState({ projectId })}
      />
    </>,
  },
  {
    path: "/login",
    element: <>
      <Header />
      <LoginState />
    </>,
  }
]);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.querySelector("#react-app")
);
