const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    "whisperDiarization.worker": path.resolve(
      __dirname,
      "src/app/web-transc/workers/whisperDiarization.worker.js",
    ),
  },
  output: {
    path: path.resolve(__dirname, "public/workers"),
    filename: "[name].js",
    globalObject: "self",
    // Use auto publicPath - will be set at runtime based on worker location
    publicPath: "auto",
  },
  target: "webworker",
  resolve: {
    extensions: [".js", ".json"],
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: ["last 2 Chrome versions"],
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      (compiler) => {
        const TerserPlugin = require("terser-webpack-plugin");
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Keep console logs for debugging
            },
          },
        }).apply(compiler);
      },
    ],
  },
  performance: {
    maxAssetSize: 10 * 1024 * 1024, // 10MB - transformers.js is large
    maxEntrypointSize: 10 * 1024 * 1024,
  },
  experiments: {
    outputModule: false, // Use IIFE format for better compatibility
  },
};
