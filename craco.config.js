// craco.config.js
module.exports = {
  devServer: {
    port: 3000,
  },
  webpack: {
    configure: (webpackConfig) => {
      // Only modify the necessary parts of devServer configuration
      if (webpackConfig.devServer) {
        // Update the devServer configuration (setupMiddlewares)
        webpackConfig.devServer.setupMiddlewares = (middlewares, devServer) => {
          // You can add custom middlewares here if needed, or just return the middlewares
          return middlewares;
        };
      }

      // Ensure fallback polyfills are correctly set
      webpackConfig.resolve.fallback = {
        crypto: require.resolve("crypto-browserify"),
        buffer: require.resolve("buffer/"),
        stream: require.resolve("stream-browserify"),
        vm: require.resolve('vm-browserify'),
      };

      return webpackConfig;
    },
  },
};
