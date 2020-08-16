import { KPuzzleDefinition } from "../definition_types";

// declare module "*.svg";

// TODO: Figure out how to import SVGs directly, in a way that works with all our build systems.

import cube222JSON from "./2x2x2.kpuzzle.json";
export const Cube222: KPuzzleDefinition = cube222JSON;

// import { readFileSync } from "fs";
// const cube222SVG = readFileSync(__dirname + "/svg/2x2x2.kpuzzle.svg", "utf8");
import cube222SVG from "./svg/2x2x2.kpuzzle.svg";
Cube222.svg = cube222SVG;
// Cube222.svg = svgJSON["2x2x2.kpuzzle.svg"];

// import cube333JSON from "./3x3x3.kpuzzle.json";
export const Cube333: KPuzzleDefinition = {} as any;
// const cube333SVG = readFileSync(__dirname + "/svg/3x3x3.kpuzzle.svg", "utf8");
import cube333SVG from "./svg/3x3x3.kpuzzle.svg";
Cube333.svg = cube333SVG;
// Cube333.svg = svgJSON["3x3x3.kpuzzle.svg"];

// import PyraminxJSON from "./pyraminx.kpuzzle.json";
export const Pyraminx: KPuzzleDefinition = {} as any;
// import pyraminxSVG from "bundle-text:./svg/pyraminx.kpuzzle.svg";
Pyraminx.svg = "pyraminxSVG";

// import square1JSON from "./sq1-hyperorbit.kpuzzle.json";
export const Square1: KPuzzleDefinition = {} as any;
// import square1SVG from "./svg/sq1-hyperorbit.kpuzzle.svg";
Square1.svg = "square1SVG";

// import clockJSON from "./clock.kpuzzle.json";
export const Clock: KPuzzleDefinition = {} as any;
// import clockSVG from "bundle-text:./svg/clock.kpuzzle.svg";
Clock.svg = "clockSVG";
