import React from 'react'
import Layout from '../components/layout'
import "../shared.css";

const MailLink = (props: { email: string }) => <a href={`mailto:${props.email}`}>{props.email}</a>;

const Homepage = () => {
  return (
    <Layout pageTitle="Home" style={{ overflow: "hidden" }}>
      <div>
        <p style={{ fontSize: "18pt" }}>
          <strong>
          Alternis is the intuitive, no-scripting dialogue editor
          and open source dialogue middleware that fits in any game engine
          or input environment.
          </strong>
        </p>
      </div>

      <iframe
        src={process.env.NODE_ENV === "development"
          ? "http://localhost:3001/index.html"
          : process.env.APP_BASEURL
        }
        style={{
          border: 0,
          height: "50vh",
          width: "100vw",
        }}
      />

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
