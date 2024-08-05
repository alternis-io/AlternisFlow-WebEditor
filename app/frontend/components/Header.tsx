import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { Split } from "../Split";
import { resetAllAppState, useAppState } from "../AppState";
import downloadFile, { uploadFile } from "../localFileManip";
import { useApi } from "../api/useApi";
import { baseUrl } from "../api/useRemoteApi";
import logoPath from "../../../resources/logo2.svg";
import { exportCurrentDialogueToJson } from "../export";

export function Header() {
  const logout = useApi(s => s.auth?.logout);
  const location = useLocation();

  // FIXME: do real query param parsing!
  const noHeaderRequested = location.search.includes("noHeaderLogo");

  const navigate = useNavigate();

  return !noHeaderRequested && <Split
    style={{
      boxShadow: "rgba(0,0,0,0.3) 0 0 5px 2px",
      zIndex: 5,
      position: "relative",
    }}
    left={
      <div style={{
        paddingLeft: 10,
        paddingTop: 2,
        paddingBottom: 2,
        display: "flex",
        gap: 11,
        alignItems: "center",
      }}>
        <a href={baseUrl} className={styles.logoLink} style={{
          // FIXME: really need a standard
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "var(--gap)",
          marginRight: 16,
        }}>
          <img src={logoPath} height={40} className="alternis__hoverable" />
          Alternis
        </a>
        <nav className="alternis__hoverable" onClick={() => navigate("/app/projects")}>
          Projects
        </nav>
      </div>
    }
    right={
      <div style={{
        display: "flex",
        gap: 11,
        paddingRight: 5,
      }}
      >
        <nav className="alternis__hoverable" onClick={() => window.open(
          "https://e0a075ca.sibforms.com/serve/MUIFANC3EaFwNn2Lb330eR8CUoK52Kqq3Iw805_JEf19NtNbXgz8blNJHfE7RaKNJADeNfGAkMOKu86zmyUy_B8V1ivmiigESd_rQkaChA0dM3eST4ictTcvmsCZXQ2ec4b_xS9nXdaF4S1fOmDeDInPn7hFEVTEiHlExtWpPGNEiPcJXdBTlt7MRtajeVcdJGC3u3dBacXZcMsz",
          "_blank"
        )}>
          Newsletter
        </nav>
        <nav className="alternis__hoverable" onClick={() => window.open(
          "https://docs.google.com/forms/d/e/1FAIpQLSdeEraQ_YVaYn01LhIQT0951B3UJ_wyroKxpP1qZoQ1zPWnjg/viewform?usp=sf_link",
          "_blank"
        )}>
          Feedback
        </nav>
      </div>
    }
  />;
}

namespace Header {
  export interface Props {}
}

export default Header;
