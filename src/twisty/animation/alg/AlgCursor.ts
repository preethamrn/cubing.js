/* eslint-disable no-case-declarations */
// TODO: private vs. public properties/methods.
// TODO: optional construtor arguments for DOM elements
// TODO: figure out what can be moved into a worker using OffscreenCanvas https://developers.google.com/web/updates/2018/08/offscreen-canvas

/* eslint-disable @typescript-eslint/no-empty-interface */

// start of imports
import { Sequence } from "../../../alg";
import { KPuzzle, KPuzzleDefinition, Transformation } from "../../../kpuzzle";
import { KPuzzleWrapper } from "../../3D/puzzles/KPuzzleWrapper";
import { Timeline, TimelineTimestampListener } from "../Timeline";
import {
  Direction,
  directionScalar,
  PuzzlePosition,
  MillisecondTimestamp,
} from "./CursorTypes";
import { TreeAlgIndexer } from "./TreeAlgIndexer";
// end of imports

// Model

export interface PositionListener {
  onPositionChange(position: PuzzlePosition): void;
}

export interface PositionDispatcher {
  addPositionListener(positionListener: PositionListener): void;
}

export interface TimeRange {
  start: MillisecondTimestamp;
  end: MillisecondTimestamp;
}

export class AlgCursor
  implements TimelineTimestampListener, PositionDispatcher {
  private todoIndexer: TreeAlgIndexer<KPuzzleWrapper>;
  private positionListeners: Set<PositionListener> = new Set(); // TODO: accessor instead of direct access
  private ksolvePuzzle: KPuzzleWrapper;
  private startState: Transformation;
  constructor(
    private timeline: Timeline,
    private def: KPuzzleDefinition,
    private alg: Sequence,
    startStateSequence?: Sequence, // TODO: accept actual start state
  ) {
    timeline.addTimestampListener(this);
    this.ksolvePuzzle = new KPuzzleWrapper(def);
    this.todoIndexer = new TreeAlgIndexer(this.ksolvePuzzle, alg);
    this.startState = startStateSequence
      ? this.algToState(startStateSequence)
      : this.ksolvePuzzle.startState();
  }

  setStartState(startState: Transformation): void {
    this.startState = startState;
    this.dispatchPositionForTimestamp(this.timeline.timestamp);
  }

  /** @deprecated */
  algToState(s: Sequence): Transformation {
    const kpuzzle = new KPuzzle(this.def);
    kpuzzle.applyAlg(s);
    return this.ksolvePuzzle.combine(this.def.startPieces, kpuzzle.state);
  }

  timeRange(): TimeRange {
    return {
      start: 0,
      end: this.todoIndexer.algDuration(),
    };
  }

  /** @deprecated */
  experimentalTimestampForStartOfLastMove(): MillisecondTimestamp {
    const numMoves = this.todoIndexer.numMoves();
    if (numMoves > 0) {
      return this.todoIndexer.indexToMoveStartTimestamp(numMoves - 1);
    }
    return 0;
  }

  addPositionListener(positionListener: PositionListener): void {
    this.positionListeners.add(positionListener);
    this.dispatchPositionForTimestamp(this.timeline.timestamp, [
      positionListener,
    ]); // TODO: should this be a separate dispatch, or should the listener manually ask for the position?
  }

  removePositionListener(positionListener: PositionListener): void {
    this.positionListeners.delete(positionListener);
  }

  onTimelineTimestampChange(timestamp: MillisecondTimestamp): void {
    this.dispatchPositionForTimestamp(timestamp);
  }

  private dispatchPositionForTimestamp(
    timestamp: MillisecondTimestamp,
    listeners: PositionListener[] | Set<PositionListener> = this
      .positionListeners,
  ): void {
    const idx = this.todoIndexer.timestampToIndex(timestamp);
    const state = this.todoIndexer.stateAtIndex(idx, this.startState) as any; // TODO
    const position: PuzzlePosition = {
      state,
      movesInProgress: [],
    };

    if (this.todoIndexer.numMoves() > 0) {
      const fraction =
        (timestamp - this.todoIndexer.indexToMoveStartTimestamp(idx)) /
        this.todoIndexer.moveDuration(idx);
      if (fraction === 1) {
        // TODO: push this into the indexer
        position.state = this.ksolvePuzzle.combine(
          state,
          this.ksolvePuzzle.stateFromMove(this.todoIndexer.getMove(idx)),
        ) as Transformation;
      } else if (fraction > 0) {
        position.movesInProgress.push({
          move: this.todoIndexer.getMove(idx),
          direction: Direction.Forwards,
          fraction,
        });
      }
    }

    for (const listener of listeners) {
      listener.onPositionChange(position);
    }
  }

  onTimeRangeChange(_timeRange: TimeRange): void {
    // nothing to do
  }

  setAlg(alg: Sequence): void {
    this.todoIndexer = new TreeAlgIndexer(this.ksolvePuzzle, alg);
    this.timeline.onCursorChange(this);
    this.dispatchPositionForTimestamp(this.timeline.timestamp);
    // TODO: Handle state change.
  }

  moveBoundary(
    timestamp: MillisecondTimestamp,
    direction: Direction.Backwards | Direction.Forwards,
  ): MillisecondTimestamp | null {
    if (this.todoIndexer.numMoves() === 0) {
      return null;
    }
    // TODO: define semantics of indexing edge cases and remove this hack.
    const offsetHack = directionScalar(direction) * 0.001;
    const idx = this.todoIndexer.timestampToIndex(timestamp + offsetHack);
    const moveStart = this.todoIndexer.indexToMoveStartTimestamp(idx);

    if (direction === Direction.Backwards) {
      return timestamp >= moveStart ? moveStart : null;
    } else {
      const moveEnd = moveStart + this.todoIndexer.moveDuration(idx);
      return timestamp <= moveEnd ? moveEnd : null;
    }
  }

  setPuzzle(
    def: KPuzzleDefinition,
    alg: Sequence = this.alg,
    startStateSequence?: Sequence,
  ): void {
    this.ksolvePuzzle = new KPuzzleWrapper(def);
    this.def = def;
    this.todoIndexer = new TreeAlgIndexer(this.ksolvePuzzle, alg);
    if (alg !== this.alg) {
      this.timeline.onCursorChange(this);
    }
    this.setStartState(
      startStateSequence
        ? this.algToState(startStateSequence)
        : this.ksolvePuzzle.startState(),
    );
    this.alg = alg;
  }
}
