import React from 'react'
import Layout from '../components/layout'
import "../shared.css";
import * as styles from "./index.module.scss";
import unityLogoUrl from "../images/U_Logo_Small_White_RGB_1C.svg";
import unrealLogoUrl from "../images/UE_Logo_stacked_unreal-engine_white.svg";
import godotLogoUrl from "../images/godot_logo_large_color_dark.svg";
import html5LogoUrl from "../images/HTML5_Logo.svg";
import { MailLink } from '../components/MailLink';
import { useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";

const Homepage = () => {
  const [iframeInteractable, setIframeInteractable] = React.useState(false);
  const mouseInteract = useOnNoLongerMouseInteracted({
    onUninterested: () => setIframeInteractable(false),
  });

  return (
    <Layout pageTitle="Home">
      <p style={{ fontSize: "18pt", textAlign: "center", }}>
        <strong>
        Alternis is the intuitive dialogue editor
        and open source dialogue middleware that
        fits on the web or in any game engine.
        </strong>
      </p>

      <div
        className="full-size"
        onClick={() => {
          setIframeInteractable(true);
        }}
        {...mouseInteract.props}
      >
        <iframe
          src={process.env.NODE_ENV === "development" ? "http://localhost:3001" : "/app/index.html#/?trial"}
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
        by <strong>declaring variables and functions</strong> for them to fill-in.
      </p>

      <p>
        All in a <strong>tiny native library with a C API</strong> that embeds in any platform easily,
        with many existing integrations: for Godot, Unreal, Unity and the web.
      </p>

      <div className="center full-size">
        <div className={styles.supportedPlatformLogos}>
          <img alt="godot-logo" src={godotLogoUrl} />
          {/* FIXME: haven't asked for permission for unreal logo usage! */}
          <img alt="unreal-logo" src={unrealLogoUrl} />
          <img alt="unity-logo" src={unityLogoUrl} />
          <img alt="html5-logo" src={html5LogoUrl} />
        </div>
      </div>


      {/* iframed feature show case? */}

      <p style={{ fontSize: "18pt", textAlign: "center", }}>
        <strong>
          Join our <a href="FIXME">newsletter</a> to receive product updates.
        </strong>
      </p>

      <p style={{ textAlign: "center" }}>
      Want custom pricing, or support for a specific engine or environment?
      <br />
      Reach out to us at <MailLink email="support@alternis.io" />
      </p>

    </Layout>
  )
}

export default Homepage
