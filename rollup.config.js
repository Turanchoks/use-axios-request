import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default {
  input: './src/useAxiosRequest.ts',
  external: Object.keys(pkg.peerDependencies || {}).concat(
    'axios/lib/helpers/buildURL'
  ),
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: { declaration: true, isolatedModules: false },
      },
    }),
    commonjs({ extensions: ['.js', '.ts'] }),
  ],
  output: [
    {
      format: 'cjs',
      file: pkg.main,
    },
    {
      format: 'es',
      file: pkg.module,
    },
  ],
};
