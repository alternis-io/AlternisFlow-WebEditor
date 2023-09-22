import React from 'react'
import Layout from '../components/layout'
import "../shared.css";
import * as styles from "./index.module.scss";
import unityLogoUrl from "../images/U_Logo_Small_White_RGB_1C.svg";
import unrealLogoUrl from "../images/UE_Logo_stacked_unreal-engine_white.svg";
import godotLogoUrl from "../images/godot_logo_large_color_dark.svg";
import html5LogoUrl from "../images/HTML5_Logo.svg";

const MailLink = (props: { email: string }) => <a href={`mailto:${props.email}`}>{props.email}</a>;

const Homepage = () => {
  return (
    <Layout pageTitle="Home">
      <p style={{ fontSize: "18pt", textAlign: "center", }}>
        <strong>
        Alternis is the intuitive dialogue editor
        and open source dialogue middleware that
        fits on the web or in any game engine.
        </strong>
      </p>

      {/*// FIXME: disable scroll somehow in the site using query params */}
      <iframe
        src={process.env.NODE_ENV === "development"
          ? "http://localhost:3001/index.html?disable-scroll"
          : process.env.APP_BASEURL
        }
        style={{
          border: 0,
          height: "50vh",
          width: "100vw",
          margin: "0.25in 0",
          pointerEvents: "none",
        }}
      />

      <p>
        Let writers express the logic of their
        dialogs&mdash;<br/>
        all visually and without writing <em>any</em> code.
      </p>

      <p>
        But give programmers the flexibility they need by declaring variables and functions
        that your dialogues include.
      </p>

      <p>
        All in a tiny native library with a C API that embeds in any platform easily,
        with many existing integrations: for Godot, Unreal, Unity and the web.
      </p>

      <div className="center">
        <div className={styles.supportedPlatformLogos}>
          <img alt="godot-logo" src={godotLogoUrl} />
          {/* FIXME: haven't asked for permission for unreal logo usage! */}
          <img alt="unreal-logo" src={unrealLogoUrl} />
          <img alt="unity-logo" src={unityLogoUrl} />
          <img alt="html5-logo" src={html5LogoUrl} />
        </div>
      </div>


      {/* iframed feature show case? */}

      <p>
      Want custom pricing, or support for a specific engine or environment?
      Reach out to our team at <MailLink email="support@alternis.com" />
      </p>

    </Layout>
  )
}

export default Homepage
