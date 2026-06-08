const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    '@protobufjs/inquire': path.resolve(__dirname, 'shims/protobufjs-inquire.js'),
  },
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === 'tslib') {
      return {
        filePath: require.resolve('tslib/tslib.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'framer-motion' && context.customResolverOptions?.environment === 'node') {
      return { type: 'empty' };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './styles/global.css' });
