import {
  AlgPart,
  BlockMove,
  Comment,
  Commutator,
  Conjugate,
  Group,
  NewLine,
  Pause,
  Sequence,
  TraversalDownUp,
  TraversalUp,
  Unit,
} from "../../../alg";
import { Puzzle, State } from "../../../twisty-old/puzzle";

// TODO: Include Pause.
class CountAnimatedMoves extends TraversalUp<number> {
  public traverseSequence(sequence: Sequence): number {
    let total = 0;
    for (const part of sequence.nestedUnits) {
      total += this.traverse(part);
    }
    return total;
  }

  public traverseGroup(group: Group): number {
    return this.traverseSequence(group.nestedSequence);
  }

  public traverseBlockMove(_blockMove: BlockMove): number {
    return 1;
  }

  public traverseCommutator(commutator: Commutator): number {
    return (
      2 *
      (this.traverseSequence(commutator.A) +
        this.traverseSequence(commutator.B))
    );
  }

  public traverseConjugate(conjugate: Conjugate): number {
    return (
      2 * this.traverseSequence(conjugate.A) +
      this.traverseSequence(conjugate.B)
    );
  }

  public traversePause(_pause: Pause): number {
    return 0;
  }

  public traverseNewLine(_newLine: NewLine): number {
    return 0;
  }

  public traverseComment(_comment: Comment): number {
    return 0;
  }
}

export interface AlgIndexer<P extends Puzzle> {
  getMove(index: number): BlockMove;
  indexToMoveStartTimestamp(index: number): Cursor.Timestamp;
  stateAtIndex(index: number): State<P>;
  transformAtIndex(index: number): State<P>;
  numMoves(): number;
  timestampToIndex(timestamp: Cursor.Timestamp): number;
  algDuration(): Cursor.Duration;
  moveDuration(index: number): number;
}

export class AlgPartDecoration<P extends Puzzle> {
  constructor(
    _puz: Puzzle,
    public moveCount: number,
    public duration: number,
    public forward: State<P>,
    public backward: State<P>,
    public children: Array<AlgPartDecoration<P>> = [],
  ) {}
}
export class DecoratorConstructor<P extends Puzzle> extends TraversalUp<
  AlgPartDecoration<P>
> {
  private identity: State<P>;
  private dummyLeaf: AlgPartDecoration<P>;
  private durationFn: TraversalUp<Cursor.Duration> = new Cursor.AlgDuration(
    Cursor.DefaultDurationForAmount,
  );

  constructor(private puz: Puzzle) {
    super();
    this.identity = puz.identity();
    this.dummyLeaf = new AlgPartDecoration<P>(
      puz,
      0,
      0,
      this.identity,
      this.identity,
      [],
    );
  }

  public traverseSequence(sequence: Sequence): AlgPartDecoration<P> {
    let moveCount = 0;
    let duration = 0;
    let state = this.identity;
    const child: Array<AlgPartDecoration<P>> = [];
    for (const part of sequence.nestedUnits) {
      const apd = this.traverse(part);
      moveCount += apd.moveCount;
      duration += apd.duration;
      state = this.puz.combine(state, apd.forward);
      child.push(apd);
    }
    return new AlgPartDecoration<P>(
      this.puz,
      moveCount,
      duration,
      state,
      this.puz.invert(state),
      child,
    );
  }

  public traverseGroup(group: Group): AlgPartDecoration<P> {
    const dec = this.traverseSequence(group.nestedSequence);
    return this.mult(dec, group.amount, [dec]);
  }

  public traverseBlockMove(blockMove: BlockMove): AlgPartDecoration<P> {
    return new AlgPartDecoration<P>(
      this.puz,
      1,
      this.durationFn.traverse(blockMove),
      this.puz.stateFromMove(blockMove),
      this.puz.stateFromMove(invertBlockMove(blockMove)),
    );
  }

  public traverseCommutator(commutator: Commutator): AlgPartDecoration<P> {
    const decA = this.traverseSequence(commutator.A);
    const decB = this.traverseSequence(commutator.B);
    const AB = this.puz.combine(decA.forward, decB.forward);
    const ApBp = this.puz.combine(decA.backward, decB.backward);
    const ABApBp = this.puz.combine(AB, ApBp);
    const dec = new AlgPartDecoration<P>(
      this.puz,
      2 * (decA.moveCount + decB.moveCount),
      2 * (decA.duration + decB.duration),
      ABApBp,
      this.puz.invert(ABApBp),
      [decA, decB],
    );
    return this.mult(dec, commutator.amount, [dec, decA, decB]);
  }

  public traverseConjugate(conjugate: Conjugate): AlgPartDecoration<P> {
    const decA = this.traverseSequence(conjugate.A);
    const decB = this.traverseSequence(conjugate.B);
    const AB = this.puz.combine(decA.forward, decB.forward);
    const ABAp = this.puz.combine(AB, decA.backward);
    const dec = new AlgPartDecoration<P>(
      this.puz,
      2 * decA.moveCount + decB.moveCount,
      2 * decA.duration + decB.duration,
      ABAp,
      this.puz.invert(ABAp),
      [decA, decB],
    );
    return this.mult(dec, conjugate.amount, [dec, decA, decB]);
  }

  public traversePause(pause: Pause): AlgPartDecoration<P> {
    return new AlgPartDecoration<P>(
      this.puz,
      1,
      this.durationFn.traverse(pause),
      this.identity,
      this.identity,
    );
  }

  public traverseNewLine(_newLine: NewLine): AlgPartDecoration<P> {
    return this.dummyLeaf;
  }

  public traverseComment(_comment: Comment): AlgPartDecoration<P> {
    return this.dummyLeaf;
  }

  private mult(
    apd: AlgPartDecoration<P>,
    n: number,
    child: Array<AlgPartDecoration<P>>,
  ): AlgPartDecoration<P> {
    const absn = Math.abs(n);
    const st = this.puz.multiply(apd.forward, n);
    return new AlgPartDecoration<P>(
      this.puz,
      apd.moveCount * absn,
      apd.duration * absn,
      st,
      this.puz.invert(st),
      child,
    );
  }
}
class WalkerDown<P extends Puzzle> {
  constructor(public apd: AlgPartDecoration<P>, public back: boolean) {
    /**/
  }
}
export class AlgWalker<P extends Puzzle> extends TraversalDownUp<
  WalkerDown<P>,
  boolean
> {
  public mv?: Unit;
  public moveDur: number;
  public back: boolean;
  public st: State<P>;
  public root: WalkerDown<P>;
  public i: number;
  public dur: number;
  private goali: number;
  private goaldur: number;
  constructor(
    public puz: P,
    public alg: AlgPart,
    public apd: AlgPartDecoration<P>,
  ) {
    super();
    this.i = -1;
    this.dur = -1;
    this.goali = -1;
    this.goaldur = -1;
    this.mv = undefined;
    this.back = false;
    this.moveDur = 0;
    this.st = this.puz.identity();
    this.root = new WalkerDown(this.apd, false);
  }

  public moveByIndex(loc: number): boolean {
    if (this.i >= 0 && this.i === loc) {
      return this.mv !== undefined;
    }
    return this.dosearch(loc, Infinity);
  }

  public moveByDuration(dur: number): boolean {
    if (this.dur >= 0 && this.dur < dur && this.dur + this.moveDur >= dur) {
      return this.mv !== undefined;
    }
    return this.dosearch(Infinity, dur);
  }

  public dosearch(loc: number, dur: number): boolean {
    this.goali = loc;
    this.goaldur = dur;
    this.i = 0;
    this.dur = 0;
    this.mv = undefined;
    this.moveDur = 0;
    this.back = false;
    this.st = this.puz.identity();
    const r = this.traverse(this.alg, this.root);
    return r;
  }

  public traverseSequence(sequence: Sequence, wd: WalkerDown<P>): boolean {
    if (!this.firstcheck(wd)) {
      return false;
    }
    if (wd.back) {
      for (let i = sequence.nestedUnits.length - 1; i >= 0; i--) {
        const part = sequence.nestedUnits[i];
        if (this.traverse(part, new WalkerDown(wd.apd.children[i], wd.back))) {
          return true;
        }
      }
    } else {
      for (let i = 0; i < sequence.nestedUnits.length; i++) {
        const part = sequence.nestedUnits[i];
        if (this.traverse(part, new WalkerDown(wd.apd.children[i], wd.back))) {
          return true;
        }
      }
    }
    return false;
  }

  public traverseGroup(group: Group, wd: WalkerDown<P>): boolean {
    if (!this.firstcheck(wd)) {
      return false;
    }
    const back = this.domult(wd, group.amount);
    return this.traverse(
      group.nestedSequence,
      new WalkerDown(wd.apd.children[0], back),
    );
  }

  public traverseBlockMove(blockMove: BlockMove, wd: WalkerDown<P>): boolean {
    if (!this.firstcheck(wd)) {
      return false;
    }
    this.mv = blockMove;
    this.moveDur = wd.apd.duration;
    this.back = wd.back;
    return true;
  }

  public traverseCommutator(
    commutator: Commutator,
    wd: WalkerDown<P>,
  ): boolean {
    if (!this.firstcheck(wd)) {
      return false;
    }
    const back = this.domult(wd, commutator.amount);
    if (back) {
      return (
        this.traverse(
          commutator.B,
          new WalkerDown(wd.apd.children[2], !back),
        ) ||
        this.traverse(
          commutator.A,
          new WalkerDown(wd.apd.children[1], !back),
        ) ||
        this.traverse(commutator.B, new WalkerDown(wd.apd.children[2], back)) ||
        this.traverse(commutator.A, new WalkerDown(wd.apd.children[1], back))
      );
    } else {
      return (
        this.traverse(commutator.A, new WalkerDown(wd.apd.children[1], back)) ||
        this.traverse(commutator.B, new WalkerDown(wd.apd.children[2], back)) ||
        this.traverse(
          commutator.A,
          new WalkerDown(wd.apd.children[1], !back),
        ) ||
        this.traverse(commutator.B, new WalkerDown(wd.apd.children[2], !back))
      );
    }
  }

  public traverseConjugate(conjugate: Conjugate, wd: WalkerDown<P>): boolean {
    if (!this.firstcheck(wd)) {
      return false;
    }
    const back = this.domult(wd, conjugate.amount);
    if (back) {
      return (
        this.traverse(conjugate.A, new WalkerDown(wd.apd.children[1], !back)) ||
        this.traverse(conjugate.B, new WalkerDown(wd.apd.children[2], back)) ||
        this.traverse(conjugate.A, new WalkerDown(wd.apd.children[1], back))
      );
    } else {
      return (
        this.traverse(conjugate.A, new WalkerDown(wd.apd.children[1], back)) ||
        this.traverse(conjugate.B, new WalkerDown(wd.apd.children[2], back)) ||
        this.traverse(conjugate.A, new WalkerDown(wd.apd.children[1], !back))
      );
    }
  }

  public traversePause(pause: Pause, wd: WalkerDown<P>): boolean {
    if (!this.firstcheck(wd)) {
      return false;
    }
    this.mv = pause;
    this.moveDur = wd.apd.duration;
    this.back = wd.back;
    return true;
  }

  public traverseNewLine(_newLine: NewLine, _wd: WalkerDown<P>): boolean {
    return false;
  }

  public traverseComment(_comment: Comment, _wd: WalkerDown<P>): boolean {
    return false;
  }

  private firstcheck(wd: WalkerDown<P>): boolean {
    if (
      wd.apd.moveCount + this.i <= this.goali &&
      wd.apd.duration + this.dur < this.goaldur
    ) {
      return this.keepgoing(wd);
    }
    return true;
  }

  private domult(wd: WalkerDown<P>, amount: number): boolean {
    let back = wd.back;
    if (amount === 0) {
      // I don't believe this will ever happen
      return back;
    }
    if (amount < 0) {
      back = !back;
      amount = -amount;
    }
    const base = wd.apd.children[0];
    const full = Math.min(
      Math.floor((this.goali - this.i) / base.moveCount),
      Math.ceil((this.goaldur - this.dur) / base.duration - 1),
    );
    if (full > 0) {
      this.keepgoing(new WalkerDown<P>(base, back), full);
    }
    return back;
  }

  private keepgoing(wd: WalkerDown<P>, mul: number = 1): boolean {
    this.i += mul * wd.apd.moveCount;
    this.dur += mul * wd.apd.duration;
    if (mul !== 1) {
      if (wd.back) {
        this.st = this.puz.combine(
          this.st,
          this.puz.multiply(wd.apd.backward, mul),
        );
      } else {
        this.st = this.puz.combine(
          this.st,
          this.puz.multiply(wd.apd.forward, mul),
        );
      }
    } else {
      if (wd.back) {
        this.st = this.puz.combine(this.st, wd.apd.backward);
      } else {
        this.st = this.puz.combine(this.st, wd.apd.forward);
      }
    }
    return false;
  }
}
export function invertBlockMove(bm: BlockMove): BlockMove {
  return new BlockMove(bm.outerLayer, bm.innerLayer, bm.family, -bm.amount);
}
const countAnimatedMovesInstance = new CountAnimatedMoves();
export const countAnimatedMoves = countAnimatedMovesInstance.traverse.bind(
  countAnimatedMovesInstance,
);

// tslint:disable-next-line no-namespace // TODO: nested module
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Cursor {
  export type Duration = number; // Duration in milliseconds
  // TODO: Extend `number`, introduce MoveSequenceTimestamp vs. EpochTimestamp,
  // force Duration to be a difference.
  export type Timestamp = Duration; // Duration since a particular epoch.

  export type Fraction = number; // Value from 0 to 1.

  export enum Direction {
    Forwards = 1,
    Paused = 0,
    Backwards = -1,
  }

  export interface MoveProgress {
    move: AlgPart;
    direction: Direction;
    fraction: number;
  }

  export interface Position<P extends Puzzle> {
    state: State<P>;
    moves: MoveProgress[];
  }

  export enum BreakpointType {
    Move,
    EntireMoveSequence,
  }

  export type DurationForAmount = (amount: number) => Duration;

  // eslint-disable-next-line no-inner-declarations
  export function ConstantDurationForAmount(_amount: number): Duration {
    return 1000;
  }

  // eslint-disable-next-line no-inner-declarations
  export function DefaultDurationForAmount(amount: number): Duration {
    switch (Math.abs(amount)) {
      case 0:
        return 0;
      case 1:
        return 1000;
      case 2:
        return 1500;
      default:
        return 2000;
    }
  }

  // eslint-disable-next-line no-inner-declarations
  export function ExperimentalScaledDefaultDurationForAmount(
    scale: number,
    amount: number,
  ): Duration {
    switch (Math.abs(amount)) {
      case 0:
        return 0;
      case 1:
        return scale * 1000;
      case 2:
        return scale * 1500;
      default:
        return scale * 2000;
    }
  }

  export class AlgDuration extends TraversalUp<Duration> {
    // TODO: Pass durationForAmount as Down type instead?
    constructor(
      public durationForAmount: (
        amount: number,
      ) => Duration = DefaultDurationForAmount,
    ) {
      super();
    }

    public traverseSequence(sequence: Sequence): Duration {
      let total = 0;
      for (const alg of sequence.nestedUnits) {
        total += this.traverse(alg);
      }
      return total;
    }

    public traverseGroup(group: Group): Duration {
      return group.amount * this.traverse(group.nestedSequence);
    }

    public traverseBlockMove(blockMove: BlockMove): Duration {
      return this.durationForAmount(blockMove.amount);
    }

    public traverseCommutator(commutator: Commutator): Duration {
      return (
        commutator.amount *
        2 *
        (this.traverse(commutator.A) + this.traverse(commutator.B))
      );
    }

    public traverseConjugate(conjugate: Conjugate): Duration {
      return (
        conjugate.amount *
        (2 * this.traverse(conjugate.A) + this.traverse(conjugate.B))
      );
    }

    public traversePause(_pause: Pause): Duration {
      return this.durationForAmount(1);
    }

    public traverseNewLine(_newLine: NewLine): Duration {
      return this.durationForAmount(1);
    }

    public traverseComment(_comment: Comment): Duration {
      return this.durationForAmount(0);
    }
  }
}
