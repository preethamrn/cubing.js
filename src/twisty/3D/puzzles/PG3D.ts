import {
  Color,
  DoubleSide,
  Euler,
  Face3,
  Geometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from "three";
import { BlockMove, modifiedBlockMove } from "../../../alg";
import {
  KPuzzleDefinition,
  stateForBlockMove,
  Transformation,
} from "../../../kpuzzle";
import { StickerDat, StickerDatSticker } from "../../../puzzle-geometry";
import { AlgCursor } from "../../animation/alg/AlgCursor";
import { TAU } from "../TAU";
import { Twisty3DPuzzle } from "./Twisty3DPuzzle";
import { smootherStep } from "../../animation/easing";
import { PuzzlePosition } from "../../animation/alg/CursorTypes";

const foundationMaterial = new MeshBasicMaterial({
  side: DoubleSide,
  color: 0x000000,
  // transparency doesn't work very well here
  // with duplicated center stickers
  //  transparent: true,
  //  opacity: 0.75,
});
const stickerMaterial = new MeshBasicMaterial({
  vertexColors: true,
  //    side: DoubleSide,
});
const polyMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  color: 0x000000,
});

function makePoly(coords: number[][], color: Color): Geometry {
  const geo = new Geometry();
  const vertind: number[] = [];
  for (const coord of coords) {
    const v = new Vector3(coord[0], coord[1], coord[2]);
    vertind.push(geo.vertices.length);
    geo.vertices.push(v);
  }
  for (let g = 1; g + 1 < vertind.length; g++) {
    const face = new Face3(vertind[0], vertind[g], vertind[g + 1]);
    face.color = color;
    geo.faces.push(face);
  }
  geo.computeFaceNormals();
  return geo;
}

class StickerDef {
  public origColor: Color;
  public faceColor: Color;
  public cubie: Group;
  protected geo: Geometry;
  constructor(
    stickerDat: StickerDatSticker,
    foundationDat: StickerDatSticker | undefined,
  ) {
    this.origColor = new Color(stickerDat.color);
    this.faceColor = new Color(stickerDat.color);
    this.cubie = new Group();
    this.geo = makePoly(stickerDat.coords as number[][], this.faceColor);
    const obj = new Mesh(this.geo, stickerMaterial);
    obj.userData.name =
      stickerDat.orbit + " " + (1 + stickerDat.ord) + " " + stickerDat.ori;
    this.cubie.add(obj);
    if (foundationDat) {
      const fgeo = makePoly(foundationDat.coords as number[][], this.faceColor);
      const foundation = new Mesh(fgeo, foundationMaterial);
      foundation.scale.setScalar(0.999); // TODO: hacky
      this.cubie.add(foundation);
    }
  }

  public setColor(c: Color): void {
    this.geo.colorsNeedUpdate = true;
    this.faceColor.copy(c);
  }
}

class HitPlaneDef {
  public cubie: Group;
  protected geo: Geometry;
  constructor(hitface: any) {
    this.cubie = new Group();
    this.geo = new Geometry();
    const coords = hitface.coords as number[][];
    const vertind: number[] = [];
    for (const coord of coords) {
      const v = new Vector3(coord[0], coord[1], coord[2]);
      vertind.push(this.geo.vertices.length);
      this.geo.vertices.push(v);
    }
    for (let g = 1; g + 1 < vertind.length; g++) {
      const face = new Face3(vertind[0], vertind[g], vertind[g + 1]);
      this.geo.faces.push(face);
    }
    this.geo.computeFaceNormals();
    const obj = new Mesh(this.geo, polyMaterial);
    obj.userData.name = hitface.name;
    this.cubie.scale.setScalar(0.99);
    this.cubie.add(obj);
  }
}

class AxisInfo {
  public axis: Vector3;
  public order: number;
  constructor(axisDat: any) {
    const vec = axisDat[0] as number[];
    this.axis = new Vector3(vec[0], vec[1], vec[2]);
    this.order = axisDat[2];
  }
}

const PG_SCALE = 0.5;

// TODO: Split into "scene model" and "view".
export class PG3D extends Object3D implements Twisty3DPuzzle {
  private stickers: { [key: string]: StickerDef[][] };
  private axesInfo: { [key: string]: AxisInfo };

  private stickerTargets: Object3D[] = [];
  private controlTargets: Object3D[] = [];

  constructor(
    cursor: AlgCursor,
    private scheduleRenderCallback: () => void,
    private definition: KPuzzleDefinition,
    private pgdat: StickerDat,
    showFoundation: boolean = false,
  ) {
    super();

    this.axesInfo = {};
    const axesDef = this.pgdat.axis as any[];
    for (const axis of axesDef) {
      this.axesInfo[axis[1]] = new AxisInfo(axis);
    }
    const stickers = this.pgdat.stickers as any[];
    this.stickers = {};
    for (let si = 0; si < stickers.length; si++) {
      const sticker = stickers[si];
      const foundation = showFoundation
        ? this.pgdat.foundations[si]
        : undefined;
      const orbit = sticker.orbit as number;
      const ord = sticker.ord as number;
      const ori = sticker.ori as number;
      if (!this.stickers[orbit]) {
        this.stickers[orbit] = [];
      }
      if (!this.stickers[orbit][ori]) {
        this.stickers[orbit][ori] = [];
      }
      const stickerdef = new StickerDef(sticker, foundation);
      stickerdef.cubie.scale.set(PG_SCALE, PG_SCALE, PG_SCALE);
      this.stickers[orbit][ori][ord] = stickerdef;
      this.add(stickerdef.cubie);
      this.stickerTargets.push(stickerdef.cubie.children[0]);
    }
    const hitfaces = this.pgdat.faces as any[];
    for (const hitface of hitfaces) {
      const facedef = new HitPlaneDef(hitface);
      facedef.cubie.scale.set(PG_SCALE, PG_SCALE, PG_SCALE);
      this.add(facedef.cubie);
      this.controlTargets.push(facedef.cubie.children[0]);
    }

    cursor!.addPositionListener(this);
  }

  public experimentalGetStickerTargets(): Object3D[] {
    return this.stickerTargets;
  }

  public experimentalGetControlTargets(): Object3D[] {
    return this.controlTargets;
  }

  public onPositionChange(p: PuzzlePosition): void {
    const pos = p.state as Transformation;
    const noRotation = new Euler();
    for (const orbit in this.stickers) {
      const pieces = this.stickers[orbit];
      const pos2 = pos[orbit];
      const orin = pieces.length;
      for (let ori = 0; ori < orin; ori++) {
        const pieces2 = pieces[ori];
        for (let i = 0; i < pieces2.length; i++) {
          pieces2[i].cubie.rotation.copy(noRotation);
          const nori = (ori + orin - pos2.orientation[i]) % orin;
          const ni = pos2.permutation[i];
          pieces2[i].setColor(pieces[nori][ni].origColor);
        }
      }
    }
    // FIXME tgr const kp = new KPuzzle(this.definition);
    for (const moveProgress of p.movesInProgress) {
      const externalBlockMove = moveProgress.move as BlockMove;
      // TODO: unswizzle goes external to internal, and so does the call after that
      // and so does the stateForBlockMove call
      const unswizzled = this.pgdat.unswizzle(externalBlockMove);
      const blockMove = this.pgdat.notationMapper.notationToInternal(
        externalBlockMove,
      );
      const simpleMove = modifiedBlockMove(externalBlockMove, { amount: 1 });
      const baseMove = stateForBlockMove(this.definition, simpleMove);
      const ax = this.axesInfo[unswizzled];
      const turnNormal = ax.axis;
      const angle =
        (-this.ease(moveProgress.fraction) *
          moveProgress.direction *
          blockMove.amount *
          TAU) /
        ax.order;
      for (const orbit in this.stickers) {
        const pieces = this.stickers[orbit];
        const orin = pieces.length;
        const bmv = baseMove[orbit];
        for (let ori = 0; ori < orin; ori++) {
          const pieces2 = pieces[ori];
          for (let i = 0; i < pieces2.length; i++) {
            const ni = bmv.permutation[i];
            if (ni !== i || bmv.orientation[i] !== 0) {
              pieces2[i].cubie.rotateOnAxis(turnNormal, angle);
            }
          }
        }
      }
    }
    this.scheduleRenderCallback!();
  }

  private ease(fraction: number): number {
    return smootherStep(fraction);
  }
}
