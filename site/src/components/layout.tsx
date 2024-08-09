import React from "react"
import { useStaticQuery, graphql } from "gatsby"

import Header from "./header"
import SEO from "./seo"
import * as styles from "./layout.module.scss"

interface LayoutProps {
  pageTitle: string
  pageDesc: string
}

const Layout = ({
  pageTitle,
  pageDesc,
  children,
}: React.PropsWithChildren<LayoutProps>) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  return (
    <div>
      <Header siteTitle={data.site.siteMetadata.title} />
      <SEO title={pageTitle} description={pageDesc} />
      <div className={styles.pageWrapper}>
        <main>{children}</main>
      </div>
      {/* FIXME: should be copyrighted by alternis company */}
      <footer className="center">
        &copy; Michael Belousov 2024
      </footer>
    </div>
  )
}
export default Layout
