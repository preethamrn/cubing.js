import { BlockMove, Sequence } from "../../../alg";
import { PuzzleWrapper, State } from "../../3D/puzzles/KPuzzleWrapper";
import {
  AlgIndexer,
  AlgPartDecoration,
  AlgWalker,
  DecoratorConstructor,
  invertBlockMove,
} from "./AlgIndexer";
import { Timestamp, Duration } from "./CursorTypes";

export class TreeAlgIndexer<P extends PuzzleWrapper> implements AlgIndexer<P> {
  private decoration: AlgPartDecoration<P>;
  private walker: AlgWalker<P>;
  constructor(private puzzle: P, alg: Sequence) {
    const deccon = new DecoratorConstructor<P>(this.puzzle);
    this.decoration = deccon.traverse(alg);
    this.walker = new AlgWalker<P>(this.puzzle, alg, this.decoration);
  }

  public getMove(index: number): BlockMove {
    // FIXME need to support Pause
    if (this.walker.moveByIndex(index)) {
      if (!this.walker.mv) {
        throw new Error("`this.walker.mv` missing");
      }
      const bm = this.walker.mv as BlockMove;
      // TODO: this type of negation needs to be in alg
      if (this.walker.back) {
        return invertBlockMove(bm);
      }
      return bm;
    }
    throw new Error("Out of algorithm: index " + index);
  }

  public indexToMoveStartTimestamp(index: number): Timestamp {
    if (this.walker.moveByIndex(index) || this.walker.i === index) {
      return this.walker.dur;
    }
    throw new Error("Out of algorithm: index " + index);
  }

  public stateAtIndex(index: number, startTransformation?: State<P>): State<P> {
    this.walker.moveByIndex(index);
    return this.puzzle.combine(
      startTransformation ?? this.puzzle.startState(),
      this.walker.st,
    );
  }

  // TransformAtIndex does not reflect the start state; it only reflects
  // the change from the start state to the current move index.  If you
  // want the actual state, use stateAtIndex.
  public transformAtIndex(index: number): State<P> {
    this.walker.moveByIndex(index);
    return this.walker.st;
  }

  public numMoves(): number {
    return this.decoration.moveCount;
  }

  public timestampToIndex(timestamp: Timestamp): number {
    this.walker.moveByDuration(timestamp);
    return this.walker.i;
  }

  public algDuration(): Duration {
    return this.decoration.duration;
  }

  public moveDuration(index: number): number {
    this.walker.moveByIndex(index);
    return this.walker.moveDur;
  }
}
