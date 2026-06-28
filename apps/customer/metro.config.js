// Metro config tuned for the Turborepo/pnpm monorepo: watch the repo root so
// changes in shared workspace packages hot-reload, and resolve modules from both
// the app and the root node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// pnpm stores transitive deps under nested node_modules, so Metro must keep
// hierarchical lookup enabled (do NOT disable it as in hoisted yarn/npm setups).
config.resolver.unstable_enableSymlinks = true;
// Honor the "exports" maps in our workspace packages (e.g. @rescuebite/ui/native).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
