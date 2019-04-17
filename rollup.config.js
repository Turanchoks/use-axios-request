import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default {
  input: './src/useAxiosRequest.ts',
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: { declaration: true, isolatedModules: false },
      },
    }),
    commonjs({ extensions: ['.js', '.ts'] }), // the ".ts" extension is required
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
