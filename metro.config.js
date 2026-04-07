const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [
  ...new Set([...config.resolver.assetExts, 'dcm']),
];
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'dcm'
);

// SVG Transformer logic
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
