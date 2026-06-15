const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

/**
 * Monorepo Metro config — watches web sibling packages and resolves @pfos/shared.
 * @see docs/techStack.md §5
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Hierarchical lookup must stay ON: npm legitimately nests some packages
    // (e.g. firebase/node_modules/@firebase/auth) and Metro needs to walk up
    // from each module to resolve them. react-native is pinned to a single
    // version via root overrides, so there's no duplicate-RN risk here.
    disableHierarchicalLookup: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
