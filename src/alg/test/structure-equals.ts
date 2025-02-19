import { Sequence } from "../algorithm";
import { structureEquals } from "../traversal";

expect.extend({
  toStructureEqual(
    expected: Sequence,
    observed: Sequence,
  ): jest.CustomMatcherResult {
    return {
      message: (): string => "Expected the same alg structure.",
      pass: structureEquals(expected, observed),
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> {
      toStructureEqual(observed: Sequence): CustomMatcherResult;
    }
  }
}

// This is needed to modify the global namespace.
export {};
