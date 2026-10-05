module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
    env: {
      // Release bundles: strip every console.* call. The app logs request/response
      // bodies and profile objects while developing; none of that may ship in a
      // production build (PHI in device logs), and it costs CPU on low-end phones.
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
