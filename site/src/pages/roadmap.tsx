import React from 'react'
import Layout from '../components/layout'
import { MailLink } from '../components/MailLink';
import "../shared.css";
import * as styles from "./roadmap.module.scss";

const Homepage = () => {
  return (
    <Layout pageTitle="Roadmap">
      <p>
        Here is a look at our goals through the next 12 months.
      </p>

      <p>
        Think your feature or platform request should be here?
        Reach out to our team at <MailLink email="support@alternis.com" />
      </p>

      <div className="center">
        <div className={styles.roadmapMilestones}>
          <div>
            wasm-powered npm package for the browser and Node.js
            <div><em>Q4-2023</em></div>
          </div>
          <div>
            Unity integration
            <div><em>Q4-2023</em></div>
          </div>
          <div>
            Define JSON spec and schema
            <div><em>Q1-2024</em></div>
          </div>
          <div>
            Integrate with OpenAI's GPT for AI-powered dialogue writing
            <div><em>Q2-2024</em></div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Homepage
