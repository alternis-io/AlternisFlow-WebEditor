import React from 'react'
import Layout from '../components/layout'

const MailLink = (props: { email: string }) => <a href={`mailto:${props.email}`}>{props.email}</a>;

const extraWide: React.CSSProperties = {
  width: "100vw",
  left: "calc(-1 * var(--horiz-padding-eqt))",
  paddingLeft: "calc((var(--horiz-padding-eqt)) / 2)",
  paddingRight: "calc((var(--horiz-padding-eqt)) / 2)",
}

const Homepage = () => {
  return (
    <Layout pageTitle="Home">
      <div style={{
        paddingTop: "0.5in",
        paddingBottom: "0.5in",
        textAlign: "center",
        ...extraWide,
        boxSizing: "border-box",
        position: "relative",
        backgroundColor: "#1a1a1d",
      }}>
        <p style={{ fontSize: "18pt" }}>
          <strong>
          Alternis is the intuitive, no-scripting dialogue editor
          and open source dialogue middleware that fits in any game engine
          or input environment.
          </strong>
        </p>

        <iframe src="http://localhost:3001/index.html" style={{
          ...extraWide,
          paddingLeft: 0,
          paddingRight: 0,
          left: 0,
        }} />
      </div>

      <p>
        Let writers express the logic of their
        dialogs&mdash;<br/>
        all visually and without writing <em>any</em> code.
      </p>

      {/* iframed feature show case? */}

      <p>
      Want custom pricing, or support for a specific engine or environment?
      Reach out to our team at <MailLink email="support@alternis.com" />
      </p>

    </Layout>
  )
}

export default Homepage
