const path = require("path");

process.env.TS_NODE_PROJECT = path.join(__dirname, "./tsconfig.json");

module.exports = {
  require: [
    "ts-node/register",
    "source-map-support/register",
    path.join(__dirname, "./global-setup"),
  ],
  timeout: 20_000,
};
