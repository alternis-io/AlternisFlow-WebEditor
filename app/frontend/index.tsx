import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { createHashRouter, RouterProvider, useNavigate, useRouteError } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { resetAllAppState, useAppState } from "./AppState";
import Header from "./components/Header";
import { LoginState } from "./components/LoginPage";
import { RedirectIfNotLoggedIn } from "./hooks/useRedirectIfNotLoggedIn";

function ResettingErrorBoundary(props: React.PropsWithChildren<{}>) {
  const navigate = useNavigate();
  const error = useRouteError();
  // FIXME: replace this with better handling
  return error
    ? (
      <div style={{ padding: 20 }}>
        <p>
          An error has occurred, the event was anonymized and sent logged for us to investigate.
          To continue, you must reset the local state, which will destroy unsaved changes.
        </p>
        <p>
          Try contacting <a href="mailto:support@alternis.io">support</a> with the
          advanced error data if that is an issue.
        </p>

        <button onClick={() => {
          resetAllAppState();
          navigate(".", { replace: true });
        }}>
          Reset local state and reload
        </button>

        <br />
        <br />

        <details style={{whiteSpace: 'pre-wrap'}}>
          <summary>Advanced error data</summary>
          <p><pre>{error?.toString()}</pre></p>
          <p><pre>{error?.stack}</pre></p>
        </details>
      </div>
    ) : this.props.children;
}

// FIXME: try browser router?
const router = createHashRouter([
  {
    path: "/",
    element: <>
      <RedirectIfNotLoggedIn />
      <Header />
      <ReactFlowProvider><Ide /></ReactFlowProvider>
    </>,
    ErrorBoundary: ResettingErrorBoundary,
  },
  {
    path: "documents",
    element: <>
      <RedirectIfNotLoggedIn />
      <Header />
      <ProjectSelector
        onSelectProject={(projectId) => useAppState.setState({ projectId })}
      />
    </>,
    ErrorBoundary: ResettingErrorBoundary,
  },
  {
    path: "login",
    element: <>
      <Header />
      <LoginState />
    </>,
    ErrorBoundary: ResettingErrorBoundary,
  },
]);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.querySelector("#react-app")
);
