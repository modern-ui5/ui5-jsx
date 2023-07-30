import { fileURLToPath } from "node:url";
import babelConfig from "./babel.config.js";

export default {
  entry: "./dist/main.js",
  output: {
    path: fileURLToPath(new URL("./test_build/dist", import.meta.url)),
    filename: "main.js",
    library: {
      type: "module",
    },
  },
  module: {
    rules: [
      {
        test: /\.[tj]sx?$/,
        use: {
          loader: "babel-loader",
          options: babelConfig,
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  experiments: {
    outputModule: true,
  },
};
