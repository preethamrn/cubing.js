// We need to tell `eslint` to ignore TS errors, because it tries to apply TS linting to JS. 🤷‍♀️
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import resolve from "rollup-plugin-node-resolve";
import notify from "rollup-plugin-notify";
import pegjs from "rollup-plugin-pegjs";
import { terser } from "rollup-plugin-terser";
import typescript2 from "rollup-plugin-typescript2";
import * as typescript from "typescript";
import json from "@rollup/plugin-json";
import { string } from "rollup-plugin-string";
import { eslint } from "rollup-plugin-eslint";
import copy from "rollup-plugin-copy";

// Due to our toolchain, `rollup` normally emits some warnings that don't
// actually indicate anything wrong with our code. We can suppress known
// warnings per target, although this would also suppress the warning if it
// appears for a new reason.
const SUPPRESS_KNOWN_WARNINGS = true;

const plugins = [
  pegjs(),
  eslint({
    exclude: [
      "src/vendor/node_modules/three/examples/jsm/libs/stats.module.*",
      "**/*.json",
      "**/*.pegjs",
      "**/*.svg",
    ],
  }),
  typescript2({
    typescript: typescript,
  }),
  notify({
    success: true,
  }),
  json(),
  string({
    include: "src/kpuzzle/definitions/svg/*.svg",
  }),
];

if (!process.env.ROLLUP_WATCH) {
  plugins.push(
    terser({
      keep_classnames: true,
      keep_fnames: true,
    }),
  );
}

const submoduleInputs = {
  "alg": "src/alg/index.ts",
  "bluetooth": "src/bluetooth/index.ts",
  "cubing": "src/cubing/index.ts",
  "kpuzzle": "src/kpuzzle/index.ts",
  "puzzle-geometry": "src/puzzle-geometry/index.ts",
  "stream": "src/stream/index.ts",
  "protocol": "src/protocol/index.ts",
  "twisty": "src/twisty/index.ts",
};

// From https://github.com/rollup/rollup/issues/794#issuecomment-260694288
// Format from: https://github.com/rollup/rollup/issues/408#issuecomment-446998462
function onwarn(ignoredErrorCodes) {
  return function (warning, warn) {
    if (SUPPRESS_KNOWN_WARNINGS && ignoredErrorCodes.includes(warning.code)) {
      return;
    }
    warn(warning);
  };
}

const cjs = {
  external: ["three"],
  input: submoduleInputs,
  output: [
    {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
    },
  ],
  plugins,
  onwarn: onwarn(["UNRESOLVED_IMPORT", "THIS_IS_UNDEFINED"]),
};

const esm = {
  external: ["three"],
  input: submoduleInputs,
  output: [
    {
      dir: "dist/esm",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    ...plugins,
    copy({
      targets: [{ src: "src/esm/package.json", dest: "dist/esm" }],
    }),
  ],
  onwarn: onwarn(["UNRESOLVED_IMPORT", "THIS_IS_UNDEFINED"]),
};

const umd = {
  input: "src/cubing/index.ts",
  output: [
    {
      file: "dist/umd/cubing.umd.js",
      format: "umd",
      name: "cubing",
      sourcemap: true,
    },
  ],
  plugins: [
    ...plugins,
    resolve({
      only: ["three"],
    }),
  ],
  onwarn: onwarn(["THIS_IS_UNDEFINED"]),
};

const umdNoTwisty = {
  input: "src/cubing/no-twisty.ts",
  output: [
    {
      file: "dist/umd/cubing.no-twisty.umd.js",
      format: "umd",
      name: "cubing",
      sourcemap: true,
    },
  ],
  plugins: plugins,
  onwarn: onwarn(["UNRESOLVED_IMPORT", "MISSING_GLOBAL_NAME"]),
};

const puzzleGeometryBin = {
  input: "src/puzzle-geometry/bin/puzzle-geometry-bin.ts",
  output: [
    {
      file: "dist/bin/puzzle-geometry-bin.js",
      format: "cjs",
      sourcemap: true,
    },
  ],
  plugins: [
    ...plugins,
    resolve({
      only: ["three"],
    }),
  ],
  onwarn: onwarn([]),
};

const configs = [cjs, esm, umd, puzzleGeometryBin];

if (!process.env.ROLLUP_WATCH) {
  configs.push(umdNoTwisty);
}

export default configs;
