module.exports = function (api) {
  const isTest = api.env('test');
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: isTest ? "react" : "nativewind" }],
      ...(!isTest ? ["nativewind/babel"] : []),
    ],
    plugins: [
      ...(!isTest ? ["react-native-reanimated/plugin"] : []),
    ],
  };
};