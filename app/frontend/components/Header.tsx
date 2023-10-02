import React from "react";
import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import { Split } from "../Split";
import { resetAllAppState, useAppState } from "../AppState";
import downloadFile, { uploadFile } from "../localFileManip";
import { baseUrl, useApi } from "../hooks/useApi";
import logoPath from "../../../resources/logo2.png";

export function Header() {
  const logout = useApi(s => s.api.logout);

  return <Split
    style={{
      boxShadow: "black 0 0 5px",
    }}
    left={
      <div style={{
        paddingLeft: 10,
        paddingTop: 2,
        paddingBottom: 2,
      }}>
        <Link to={baseUrl} className={styles.logoLink} style={{
          // FIXME: really need a standard
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "var(--gap)",
        }}>
          <img src={logoPath} height={40} className="hoverable" />
          Alternis
        </Link>
      </div>
    }
    right={
      <div style={{
        display: "flex",
        gap: 11,
        paddingRight: 5,
      }}
      >
        <button>Newsletter</button>
        <button>Feedback</button>
        <button>Search</button>
        <Link to="/documents">
          <button>Projects</button>
        </Link>
        <button
          onClick={() => {
            downloadFile({
              fileName: 'doc.name.json',
              content: JSON.stringify(useAppState.getState().document, undefined, "  "),
            });
          }}
        >
          Export
        </button>
        <button
          onClick={async () => {
            const file = await uploadFile({ type: 'text' })
            const json = JSON.parse(file.content)
            // FIXME: validate state!
            useAppState.setState(json);
          }}
        >
          Import
        </button>
        <button
          onClick={async () => {
            resetAllAppState();
          }}
        >
          Reset
        </button>
        <button onClick={logout}>
          Logout
        </button>
      </div>
    }
  />;
}

namespace Header {
  export interface Props {}
}

export default Header;
