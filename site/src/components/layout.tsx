import React from "react"
import { useStaticQuery, graphql } from "gatsby"

import Header from "./header"
import SEO from "./seo"
import * as styles from "./layout.module.scss"

interface LayoutProps {
  pageTitle: string
}

const Layout = ({
  pageTitle,
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
      <SEO title={pageTitle} />
      <div className={styles.pageWrapper}>
        <main>{children}</main>
      </div>
      <footer className="center">
        &copy; Michael Belousov 2023
      </footer>
    </div>
  )
}
export default Layout
