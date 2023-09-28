import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { resetAllAppState, useAppState } from "./AppState";
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

class ResettingErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { error?: Error | undefined }> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo): void {
    // FIXME: log error
  }

  onErrorReload() {
    resetAllAppState();
    this.setState({ error: undefined })
  }

  render() {
    // FIXME: replace this with better handling
    return (this.state.error)
      ? <div style={{ padding: 20 }}>
          <p>
            An error has occurred. You probably have to reset the local state, which will
            destroy unsaved changes.
          </p>
          <p> Try contacting <a href="mailto:support@alternis.io">support</a> if that is an issue. </p>
          <button onClick={this.onErrorReload.bind(this)}>Reset local state and reload</button>
        </div>
      : this.props.children
    ;
  }
}

ReactDOM.render(
  <React.StrictMode>
    <ResettingErrorBoundary>
      <RouterProvider router={router} />
    </ResettingErrorBoundary>
  </React.StrictMode>,
  document.querySelector("#react-app")
);
