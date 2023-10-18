const path = require("path");

/** @type {import("gatsby").GatsbyConfig} */
module.exports = {
  siteMetadata: {
    title: `Alternis`,
    description: `Alternis dialogue editor`,
    author: `Mike Belousov`,
    siteUrl: `https://alternis.io`,
    image: "../resources/logo2.svg"
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: path.join(__dirname, 'src/images'),
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `gatsby-starter-default`,
        short_name: `alternis.io`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `../resources/logo2.svg`,
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
    `gatsby-plugin-sass`,
    `gatsby-plugin-typescript`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `blog-articles`,
        path: path.join(__dirname, 'src/blog'),
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
              inlineCodeMarker: `:LANG>`,
              aliases: {
                sh: `bash`
              },
            },
          }
        ],
      },
    },
    // incomplete copy of the following:
    // https://www.npmjs.com/package/gatsby-plugin-feed
    // which shows how to generate an RSS feed from our blog data
    {
      resolve: `gatsby-plugin-feed`,
      /** @type {import("gatsby-plugin-pnpm").IPluginOptions} */
      options: {
        feeds: [
          {
            query: `
              {
                allMarkdownRemark(
                  sort: { order: DESC, fields: [frontmatter___date] },
                ) {
                  nodes {
                    excerpt
                    html
                    fields {
                      slug
                    }
                    frontmatter {
                      title
                      date
                    }
                  }
                }
              }
            `,
            serialize: ({ query: { site, allMarkdownRemark } }) => {
              return allMarkdownRemark.nodes.map(node => ({
                ...node.frontmatter,
                description: node.excerpt,
                date: node.frontmatter.date,
                url: site.siteMetadata.siteUrl + node.fields.slug,
                guid: site.siteMetadata.siteUrl + node.fields.slug,
                custom_elements: [{ "content:encoded": node.html }],
              }));
            },
            output: "/rss.xml",
            title: "Alternis dev blog RSS feed",
          }
        ],
      },
    },
    'gatsby-plugin-pnpm'
  ],
}
