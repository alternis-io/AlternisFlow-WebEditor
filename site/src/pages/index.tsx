import React from 'react'
import Layout from '../components/layout'
import "../shared.css";
import * as styles from "./index.module.scss";
import unrealLogoUrl from "../images/UE_Logo_stacked_unreal-engine_white.svg";
import godotLogoUrl from "../images/godot_logo_large_color_dark.svg";
import html5LogoUrl from "../images/HTML5_Logo.svg";
import { MailLink } from '../components/MailLink';
import { useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";

const desc = `
Alternis is an experimental dialogue editor
and open source dialogue middleware that
fits on the web or in any game engine portably.`;

const Homepage = () => {
  const [iframeInteractable, setIframeInteractable] = React.useState(false);
  const mouseInteract = useOnNoLongerMouseInteracted({
    delayMs: 1500,
    onUninterested: () => setIframeInteractable(false),
  });

  return (
    <Layout pageTitle="Home" pageDesc={desc}>
      <p style={{ fontSize: "18pt", textAlign: "center", }}>
        <strong>{desc}</strong>
      </p>

      <div
        className="full-size"
        onClick={() => {
          setIframeInteractable(true);
        }}
        {...mouseInteract.props}
        style={{
          height: "50vh",
          padding: 0,
        }}
      >
        <iframe
          src={process.env.NODE_ENV === "development"
            ? "http://localhost:3001/app?demo&noTutorial&noHeaderLogo"
            : "/app/?demo&noTutorial&noHeaderLogo"}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            // FIXME: disable scroll somehow in the app using query params
            // or add a "click to play" overlay that turns on pointerEvents
            pointerEvents: iframeInteractable ? undefined : "none",
          }}
        />
        <div
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            position: "absolute",
            opacity: iframeInteractable ? 0 : 1,
            transition: "all 100ms ease",
            backgroundColor: iframeInteractable ? undefined : "#000000aa",
            zIndex: 1000,
            pointerEvents: iframeInteractable ? "none" : undefined,
          }}
          className="center hoverable"
        >
          Click to activate
        </div>
      </div>

      <p>
        Let your writers express the logic of their
        dialogs with intuitive <strong>path-locking</strong>, random switches, and more&mdash;<br/>
        All visually and without writing code.
      </p>

      <p>
        Give your programmers the flexibility they need
        by <strong>declaring variables and functions</strong> for them to fill-in and edit.
      </p>

      <p>
        All in a <strong>tiny native library with a C API</strong> that embeds in any platform easily,
        already with these integrations: for Godot, Unreal, and the web.
      </p>

      <div className="center full-size">
        <div className={styles.supportedPlatformLogos}>
          <img alt="godot-logo" src={godotLogoUrl} />
          {/* FIXME: haven't asked for permission for unreal logo usage! */}
          <img alt="unreal-logo" src={unrealLogoUrl} />
          <img alt="html5-logo" src={html5LogoUrl} />
        </div>
      </div>

      <p style={{ fontSize: "18pt", textAlign: "center", }}>
        <strong>
          Join our <a target="_blank" href="https://e0a075ca.sibforms.com/serve/MUIFANC3EaFwNn2Lb330eR8CUoK52Kqq3Iw805_JEf19NtNbXgz8blNJHfE7RaKNJADeNfGAkMOKu86zmyUy_B8V1ivmiigESd_rQkaChA0dM3eST4ictTcvmsCZXQ2ec4b_xS9nXdaF4S1fOmDeDInPn7hFEVTEiHlExtWpPGNEiPcJXdBTlt7MRtajeVcdJGC3u3dBacXZcMsz">
            newsletter
          </a> to receive updates.
        </strong>
      </p>

      <p style={{ textAlign: "center" }}>
      Want support for a specific engine or environment?
      <br />
      Reach out to us at <MailLink email="support@alternis.io" />
      </p>
    </Layout>
  )
}

export default Homepage
