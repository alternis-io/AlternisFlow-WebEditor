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
    <Layout pageTitle="Roadmap">
      <p>
        All in a tiny native library with a C API that embeds in any platform easily,
        with many existing integrations: for Godot, Unreal, Unity and the web.
      </p>

      <div className="center">
        <div className={styles.supportedPlatformLogos}>
          <div>
            Build unity integration
          </div>
          <div>
            Define Spec
          </div>
          <div>
            Integrate with OpenAI's GPT for AI-powered dialogue writing
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Homepage
