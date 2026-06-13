const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;
const zustandMiddlewarePath = require.resolve('zustand/middleware', {
  paths: [projectRoot, monorepoRoot],
});

// Watch all files within the monorepo
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), monorepoRoot]));

// Resolve packages from monorepo root node_modules as fallback
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: zustandMiddlewarePath,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
