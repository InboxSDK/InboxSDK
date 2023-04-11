/* eslint-disable flowtype/require-valid-file-annotation */

const csso = require('postcss-csso');

module.exports = {
  plugins: [csso()],
};
