const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const webNativeShims = {
  'react-native-maps': path.resolve(__dirname, 'src/shims/react-native-maps.web.tsx'),
  '@react-native-community/datetimepicker': path.resolve(
    __dirname,
    'src/shims/datetimepicker.web.tsx'
  ),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webNativeShims[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: webNativeShims[moduleName],
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
