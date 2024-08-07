import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { Split } from "../Split";
import { baseUrl } from "../api/useRemoteApi";
import logoPath from "../../../resources/logo2.svg";
import { useTutorialStore } from "../Tutorial1";

// FIXME: reuse
export function useOnExternalClick<T extends HTMLElement | null, U extends HTMLElement | null>(
  callback: () => void,
  args: {
    ref: React.MutableRefObject<T>,
    trigger: React.MutableRefObject<U> | undefined,
  },
): void {
  const { ref, trigger } = args;
  React.useEffect(() => {
    function handleClickOutside(e: any) {
      if (ref.current === null)
        return;
      if (trigger !== undefined && trigger.current === null)
        return;

      const outsideButNotInTrigger
        = trigger !== undefined
        ? !ref.current.contains(e.target) && !trigger.current!.contains(e.target)
        : !ref.current.contains(e.target);

      if (outsideButNotInTrigger) {
        callback();
      }
    }

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [trigger, ref, callback]);
}

export function Header() {
  const location = useLocation();

  // FIXME: put this in the hash
  // FIXME: do real query param parsing!
  const noHeaderRequested
    = location.search.includes("noHeaderLogo")
    || location.hash.includes("noHeaderLogo");

  const navigate = useNavigate();
  const [aboutModalOpen, setAboutModalOpen] = React.useState(false);

  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const aboutButtonRef = React.useRef<HTMLElement>(null);

  // FIXME: this doens't work when pressing the grid which is important
  useOnExternalClick(() => {
      setAboutModalOpen(false);
    }, {
    ref: dialogRef,
    trigger: aboutButtonRef,
  });


  const aboutDialog = (
    <dialog className={styles.aboutDialog} open={aboutModalOpen} ref={dialogRef}>
      <h2> The Alternis Editor </h2>
      <p>
        A visual editor for the Alternis dialogue middleware's dialogue format.
      </p>
      <p>
        Open source at <a href="https://github.com/alternis-io/DialogueMiddleware">Github</a>.
      </p>
      <p>
        Check out the tutorial in the header for help but feel free to use the feedback link or contact
        the author.
      </p>
      <p>
        Made by <a href="https://mikemikeb.com">Michael Belousov</a>
      </p>
    </dialog>
  );

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
        paddingRight: 11,
      }}
      >
        <nav className="alternis__hoverable" onClick={() => window.open(
          "https://e0a075ca.sibforms.com/serve/MUIFANC3EaFwNn2Lb330eR8CUoK52Kqq3Iw805_JEf19NtNbXgz8blNJHfE7RaKNJADeNfGAkMOKu86zmyUy_B8V1ivmiigESd_rQkaChA0dM3eST4ictTcvmsCZXQ2ec4b_xS9nXdaF4S1fOmDeDInPn7hFEVTEiHlExtWpPGNEiPcJXdBTlt7MRtajeVcdJGC3u3dBacXZcMsz",
          "_blank"
        )}>
          Newsletter
        </nav>
        <nav className="alternis__hoverable" onClick={() => useTutorialStore.setState({ tutorialOpen: true })}>
          Tutorial
        </nav>
        <nav className="alternis__hoverable" onClick={() => window.open(
          "https://docs.google.com/forms/d/e/1FAIpQLSdeEraQ_YVaYn01LhIQT0951B3UJ_wyroKxpP1qZoQ1zPWnjg/viewform?usp=sf_link",
          "_blank"
        )}>
          Feedback
        </nav>
        {/* FIXME: add dialog */}
        <nav ref={aboutButtonRef} className="alternis__hoverable" onClick={() => setAboutModalOpen(p => !p)}>
          About
          {aboutDialog}
        </nav>
      </div>
    }
  />;
}

namespace Header {
  export interface Props {}
}

export default Header;
