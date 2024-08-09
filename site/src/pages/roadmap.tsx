import React from 'react';
import Layout from '../components/layout'
import { MailLink } from '../components/MailLink';
import "../shared.css";
import * as styles from "./roadmap.module.scss";
import { classNames } from 'js-utils/lib/react-utils';

const Homepage = () => {
  return (
    <Layout pageTitle="Roadmap" pageDesc="A roadmap of milestones to work on for the alternis project">
      <p>
        Here is a look at our goals through the next 12 months.
      </p>

      <p>
        Think your feature or platform request should be here?
        <br/>
        Reach out to us at <MailLink email="support@alternis.io" />
      </p>

      <div className="center">
        <div {...classNames(styles.roadmapMilestones, "full-size")}>
          <div>
            Unity integration
            <div><em>Q4-2023</em></div>
          </div>
          <div>
            Define JSON spec and schema
            <div><em>Q1-2024</em></div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Homepage
