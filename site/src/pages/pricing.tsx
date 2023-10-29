import React from 'react';
import Layout from '../components/layout'
import { MailLink } from '../components/MailLink';
import "../shared.css";
import * as styles from "./roadmap.module.scss";
import { classNames } from 'js-utils/lib/react-utils';

const Homepage = () => {
  return (
    <Layout pageTitle="Pricing">
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
            <em>Trial</em>
            <strong>Free</strong>
            <p>Create dialogues with up to 100 dialogue events.</p>
          </div>
          <div>
            <em>Standard</em>
            <strong>$5/mo</strong>
            <p>Create up to 1000 dialogues</p>
          </div>
          <div>
            <em>Enterprise</em>
            <strong><a href="mailto:support@alternis.io">Custom</a></strong>
            <p>Unlimited usage, source code access, custom integrations</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Homepage
