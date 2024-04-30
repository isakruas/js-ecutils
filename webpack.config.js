const path = require('path')

module.exports = {
  entry: {
    bundle: './dist/index.js', // Use o arquivo principal de entrada do seu pacote
  },
  output: {
    filename: '[name].js', // Use o nome 'bundle.js' como padrão
    path: path.resolve(__dirname, 'dist'), // Diretório de saída
    asyncChunks: true,
    library: 'ecutils',
    libraryTarget: 'window',
  },
}
