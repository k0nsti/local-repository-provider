import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',
  output: {
    file: 'build/bundle-test.js',
    format: 'cjs',
    sourcemap: true
  },
  external: ['ava', 'fs', 'util', 'path', 'os', 'repository-provider'],
  plugins: [multiEntry()]
};
