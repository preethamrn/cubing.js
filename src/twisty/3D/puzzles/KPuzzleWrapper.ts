import { BlockMove, blockMoveToString } from "../../../alg";
import {
  Combine,
  EquivalentStates,
  IdentityTransformation,
  Invert,
  KPuzzleDefinition,
  Puzzles,
  stateForBlockMove,
  Transformation,
} from "../../../kpuzzle";

export type MoveName = string;

export interface MoveProgress {
  blockMove: BlockMove;
  fraction: number;
}

// tslint:disable-next-line no-empty-interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars-experimental
export interface State<T extends PuzzleWrapper> {}

export abstract class PuzzleWrapper {
  public abstract startState(): State<PuzzleWrapper>;
  public abstract invert(state: State<PuzzleWrapper>): State<PuzzleWrapper>;
  public abstract combine(
    s1: State<PuzzleWrapper>,
    s2: State<PuzzleWrapper>,
  ): State<PuzzleWrapper>;

  public multiply(
    state: State<PuzzleWrapper>,
    amount: number,
  ): State<PuzzleWrapper> {
    if (amount < 0) {
      return this.invert(this.multiply(state, -amount));
    }

    let newState = this.identity();
    while (amount > 0) {
      if (amount % 2 === 1) {
        newState = this.combine(newState, state);
      }
      amount = Math.floor(amount / 2);
      state = this.combine(state, state);
    }
    return newState;
  }

  public abstract stateFromMove(blockMove: BlockMove): State<PuzzleWrapper>;
  public abstract identity(): State<PuzzleWrapper>;
  public abstract equivalent(
    s1: State<PuzzleWrapper>,
    s2: State<PuzzleWrapper>,
  ): boolean;
}

interface KSolvePuzzleState extends Transformation, State<KPuzzleWrapper> {}

export class KPuzzleWrapper extends PuzzleWrapper {
  // don't work the underlying kdefinition/multiply so hard
  public static fromID(id: string): KPuzzleWrapper {
    return new KPuzzleWrapper(Puzzles[id]);
  }

  public moveStash: { [key: string]: Transformation } = {};
  constructor(private definition: KPuzzleDefinition) {
    super();
  }

  public startState(): KSolvePuzzleState {
    return this.definition.startPieces;
  }

  public invert(state: KSolvePuzzleState): KSolvePuzzleState {
    return Invert(this.definition, state);
  }

  public combine(
    s1: KSolvePuzzleState,
    s2: KSolvePuzzleState,
  ): KSolvePuzzleState {
    return Combine(this.definition, s1, s2);
  }

  public stateFromMove(blockMove: BlockMove): KSolvePuzzleState {
    const key = blockMoveToString(blockMove);
    if (!this.moveStash[key]) {
      this.moveStash[key] = stateForBlockMove(this.definition, blockMove);
    }
    return this.moveStash[key];
  }

  public identity(): KSolvePuzzleState {
    return IdentityTransformation(this.definition);
  }

  public equivalent(s1: KSolvePuzzleState, s2: KSolvePuzzleState): boolean {
    return EquivalentStates(this.definition, s1, s2);
  }
}

class QTMCounterState implements State<QTMCounterPuzzle> {
  constructor(public value: number) {}
}

export class QTMCounterPuzzle extends PuzzleWrapper {
  public startState(): QTMCounterState {
    return new QTMCounterState(0);
  }

  public invert(state: QTMCounterState): QTMCounterState {
    return new QTMCounterState(-state.value);
  }

  public combine(s1: QTMCounterState, s2: QTMCounterState): QTMCounterState {
    return new QTMCounterState(s1.value + s2.value);
  }

  public stateFromMove(blockMove: BlockMove): QTMCounterState {
    return new QTMCounterState(Math.abs(blockMove.amount));
  }

  public identity(): QTMCounterState {
    return new QTMCounterState(0);
  }

  public equivalent(s1: QTMCounterState, s2: QTMCounterState): boolean {
    return s1.value === s2.value;
  }
}
