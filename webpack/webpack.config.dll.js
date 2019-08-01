const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'development',
  entry: {
    vendors: [
      // '@babel/polyfill',
      // '@clusterws/cws',
      // '@google-cloud/language',
      '@mattkrick/graphql-trebuchet-client',
      '@mattkrick/sanitize-svg',
      '@mattkrick/trebuchet-client',
      '@segment/snippet',
      '@sentry/browser',
      // '@sentry/node',
      // 'analytics-node',
      'aphrodite-local-styles',
      // 'auth0',
      'auth0-js',
      // 'aws-sdk',
      // 'bcryptjs',
      'body-parser',
      'camel-case',
      'cheerio',
      'compression',
      'compute-cosine-similarity',
      'cors',
      // 'dataloader',
      // 'dotenv',
      // 'dotenv-expand',
      'draft-js',
      'draft-js-export-markdown',
      'email-addresses',
      'emotion',
      'enzyme',
      'enzyme-adapter-react-16',
      'es6-promisify',
      'eventemitter3',
      // 'expect',
      // 'express',
      // 'express-jwt',
      // 'express-rate-limit',
      'fbjs',
      'flatted',
      'graphiql',
      // 'graphql',
      // 'graphql-redis-subscriptions',
      'graphql-relay',
      'hoist-non-react-statics',
      'immutable',
      // 'ioredis',
      'iterall',
      'json2csv',
      // 'jsonwebtoken',
      'jwt-decode',
      'linkify-it',
      // 'mailgun-js',
      'micro-memoize',
      // 'migrate-rethinkdb',
      // 'mime-types',
      'ms',
      // 'node-env-flag',
      // 'node-fetch',
      // 'oy-vey',
      'prop-types',
      'react',
      'react-async-hoc',
      'react-beautiful-dnd',
      'react-copy-to-clipboard',
      'react-custom-scrollbars',
      'react-day-picker',
      'react-dnd',
      'react-dnd-html5-backend',
      'react-dnd-scrollzone',
      'react-dom',
      'react-dom-confetti',
      'react-emotion',
      'react-fontawesome',
      'react-helmet',
      'react-hot-loader',
      'react-hotkey-hoc',
      'react-loadable',
      'react-notification-system',
      'react-redux',
      'react-relay',
      'react-router',
      'react-router-dom',
      'react-test-renderer',
      'react-transition-group',
      'react-virtualized',
      'redux',
      'redux-thunk',
      'relay-runtime',
      'resize-observer-polyfill',
      // 'rethinkdbdash',
      'secure-compare',
      // 'serve-favicon',
      'shortid',
      'string-score',
      'string-similarity',
      // 'stripe',
      // 'tayden-clusterfck',
      'tinycolor2',
      'tlds',
      // 'ts-node',
      'tslib',
      'unicode-substring'
      // 'wrtc'
    ]
  },
  output: {
    filename: '[name].dll.js',
    path: path.join(__dirname, '../dll'),
    library: '[name]'
  },
  plugins: [
    new webpack.DllPlugin({name: '[name]', path: path.join(__dirname, '../dll', '[name].json')}) // eslint-disable-line no-new
  ],
  module: {
    rules: [
      {test: /\.flow$/, loader: 'ignore-loader'},
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      }
    ]
  }
}