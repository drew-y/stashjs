module.exports = {
  entry: './cash.test.ts',
  output: {
    path: './serve-me',
    filename: 'cash.bundle.js',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
  },
  module: {
    loaders: [
        { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
};