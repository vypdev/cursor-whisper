const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: {
    vscode: 'commonjs vscode',
    '@kstonekuan/audio-capture': 'commonjs @kstonekuan/audio-capture',
    '@cursor/sdk': 'commonjs @cursor/sdk',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'token-costs': path.resolve(__dirname, 'node_modules/token-costs/dist/npm/index.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  mode: 'none',
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log'
  }
};
