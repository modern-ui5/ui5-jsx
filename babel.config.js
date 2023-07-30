export default {
  presets: [
    ["@babel/preset-env", { targets: "defaults", modules: false }],
    "@babel/preset-typescript",
  ],
  plugins: [
    [
      "@babel/plugin-transform-react-jsx",
      { runtime: "automatic", importSource: "#internal" },
    ],
    "babel-plugin-ui5-esm",
  ],
};
