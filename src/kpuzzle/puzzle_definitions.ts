import { KPuzzleDefinition } from "./definition_types";
import {
  Clock,
  Cube222,
  Cube333,
  Pyraminx,
  Square1,
  Cube333LL,
} from "./definitions";

export const Puzzles: { [key: string]: KPuzzleDefinition } = {
  "2x2x2": Cube222,
  "3x3x3": Cube333,
  "3x3x3LL": Cube333LL,
  "pyraminx": Pyraminx,
  "sq1": Square1,
  "clock": Clock,
};
