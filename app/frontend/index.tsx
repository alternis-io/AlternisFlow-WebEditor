import React from "react";
import ReactDOM from "react-dom/client";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { createBrowserRouter, RouterProvider, useNavigate, useRouteError } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { resetAllAppState, useAppState } from "./AppState";
import Header from "./components/Header";
import { LoginState } from "./components/LoginPage";
import { RedirectIfNotLoggedIn } from "./hooks/useRedirectIfNotLoggedIn";
import { Provider as PouchDbProvider } from "use-pouchdb";
import { docs } from "./api/usePouchDbApi";

function ResettingErrorBoundary(props: React.PropsWithChildren<{}>) {
  const error = useRouteError();
  // FIXME: replace this with better handling
  return error
    ? (
      <div style={{ padding: 20 }}>
        <p>
          An error has occurred. To continue, try reloading the page. If that doesn't work, you must reset the local state,
          which will likely destroy unsaved changes.
        </p>
        {/* FIXME: maybe they can just use "undo" ? */}
        <p>
          Try contacting <a href="mailto:support@alternis.io">support</a> with the
          advanced error data if that is an issue.
        </p>

        <button onClick={() => window.location.reload()}>
          reload the page
        </button>

        <br />

        <button onClick={() => {
          resetAllAppState();
          window.location.reload();
        }}>
          <strong style={{ color: "red" }}>delete local state</strong> and reload
        </button>

        <br />

        <details style={{whiteSpace: 'pre-wrap'}}>
          <summary>Advanced error data</summary>
          <pre>{error?.toString()}</pre>
          <br />
          <pre>{error?.stack}</pre>
        </details>
      </div>
    ) : this.props.children;
}

// FIXME: try browser router?
const router = createBrowserRouter([
  {
    path: "app",
    element: <>
      <RedirectIfNotLoggedIn />
      <ReactFlowProvider>
        <Header />
        <Ide />
      </ReactFlowProvider>
    </>,
    ErrorBoundary: ResettingErrorBoundary,
  },
  {
    path: "app/projects",
    element: <>
      <RedirectIfNotLoggedIn />
      <Header />
      <ProjectSelector
        onSelectProject={(projectId) => {
          useAppState.setState({ projectId });
          router.navigate("/app");
        }}
      />
    </>,
    ErrorBoundary: ResettingErrorBoundary,
  },
  {
    path: "app/login",
    element: <>
      <Header />
      <LoginState />
    </>,
    ErrorBoundary: ResettingErrorBoundary,
  },
]);

const root = ReactDOM.createRoot(document.querySelector("#react-app")!);

root.render(
  <React.StrictMode>
    <PouchDbProvider pouchdb={docs}>
      <RouterProvider router={router} />
    </PouchDbProvider>
  </React.StrictMode>,
);
