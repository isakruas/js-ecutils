const path = require('path')

module.exports = {
  // entry: {
  //   bundle: './dist/npm/index.js',
  // },
  entry: './src/index.js', 
  output: {
    filename: 'min.js',
    path: path.resolve(__dirname, 'dist/web/'),
    asyncChunks: true,
    library: 'ecutils',
    libraryTarget: 'window',
    globalObject: 'this',
  },
  optimization: {
    minimize: true,
  },
}
