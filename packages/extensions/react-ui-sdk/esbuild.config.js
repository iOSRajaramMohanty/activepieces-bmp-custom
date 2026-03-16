const { resolve } = require('path');

module.exports = {
  alias: {
    '@activepieces/react-ui': resolve(__dirname, '../react-ui/src'),
  },
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
};
