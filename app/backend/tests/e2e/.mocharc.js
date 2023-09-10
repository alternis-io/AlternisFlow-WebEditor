const path = require("path");

module.exports = {
  require: [path.join(__dirname, "global-setup")],
  timeout: 20_000,
};
