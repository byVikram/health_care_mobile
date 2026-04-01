const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [
  ...new Set([...config.resolver.assetExts, 'dcm']),
];
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'dcm'
);

module.exports = config;
