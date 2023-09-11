const path = require("path");

module.exports = {
  require: ["source-map-support/register", path.join(__dirname, "lib/backend/tests/e2e/global-setup")],
  timeout: 20_000,
};
