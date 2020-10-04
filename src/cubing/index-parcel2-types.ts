// This is a copy of `index.ts`, to work around a bug where Parcel 2 assumes each target has a different entry file.
// https://github.com/parcel-bundler/parcel/issues/4797#issuecomment-649096664
// Note that this also needs to reuse the `types` target
// https://github.com/parcel-bundler/parcel/issues/5010

import "regenerator-runtime/runtime"; // Prevent `regeneratorRuntime is not defined` error. https://github.com/babel/babel/issues/5085

// TODO: `export * as ...`?
import * as alg from "../alg";
import * as bluetooth from "../bluetooth";
import * as kpuzzle from "../kpuzzle";
import * as protocol from "../protocol";
import * as puzzleGeometry from "../puzzle-geometry";
import * as stream from "../stream";
import * as twisty from "../twisty";

export { alg };
export { bluetooth };
export { protocol };
export { kpuzzle };
export { stream };
export { twisty };

// TODO: Export `puzzle-geometry` as `puzzle-geometry`, if at all possible.
// https://github.com/cubing/cubing.js/issues/1
export { puzzleGeometry };
