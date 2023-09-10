const path = require("path");

process.env.TS_NODE_PROJECT = path.join(__dirname, "tests/e2e/tsconfig.json");

module.exports = {
  require: ["ts-node/register"],
  extension: ["ts"],
  timeout: 20_000,
};
