const path = require("path");

module.exports = {
  require: [path.join(__dirname, "lib/backend/tests/e2e/global-setup")],
  timeout: 20_000,
};
