import * as THREE from 'three';
import type { MediaUvCrop } from '../../systems/led/mediaUvCrop';

/** Main center wall module count (do not change main mesh — used for scale math). */
export const MAIN_GRID_COLS = 6;
export const MAIN_GRID_ROWS = 4;

/** Inner side walls: 2 wide × 5 tall (left & right of main). */
export const INNER_GRID_COLS = 2;
export const INNER_GRID_ROWS = 5;

/** End caps: 1 wide × 5 tall (far left & far right). */
export const END_GRID_COLS = 1;
export const END_GRID_ROWS = 5;

/** Inner 2×5 width = 2 modules × scale (slightly slimmer). */
export const INNER_WIDTH_SCALE = 0.88;

/** Gap between adjacent walls along the straight row (meters). */
export const WALL_GAP = 0.8;

export interface ModuleSize {
  width: number;
  height: number;
}

export interface WallSlotLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function moduleSizeFromMain(
  wallWidth: number,
  wallHeight: number,
): ModuleSize {
  return {
    width: wallWidth / MAIN_GRID_COLS,
    height: wallHeight / MAIN_GRID_ROWS,
  };
}

export function innerWallDimensions(
  wallWidth: number,
  wallHeight: number,
): { width: number; height: number } {
  const mod = moduleSizeFromMain(wallWidth, wallHeight);
  return {
    width: mod.width * INNER_GRID_COLS * INNER_WIDTH_SCALE,
    height: mod.height * INNER_GRID_ROWS,
  };
}

export function endWallDimensions(
  wallWidth: number,
  wallHeight: number,
): { width: number; height: number } {
  const mod = moduleSizeFromMain(wallWidth, wallHeight);
  return {
    width: mod.width * END_GRID_COLS,
    height: mod.height * END_GRID_ROWS,
  };
}

/** @deprecated use innerWallDimensions */
export const leftWallDimensions = innerWallDimensions;
/** @deprecated use endWallDimensions */
export const midWallDimensions = endWallDimensions;

/**
 * Straight line, parallel faces:
 * [ 1×5 L ] — [ 2×5 L ] — [ Main 6×4 ] — [ 2×5 R ] — [ 1×5 R ]
 */
export function straightWallRowLayout(
  wallWidth: number,
  wallHeight: number,
): {
  leftEnd: WallSlotLayout;
  leftInner: WallSlotLayout;
  main: WallSlotLayout;
  rightInner: WallSlotLayout;
  rightEnd: WallSlotLayout;
} {
  const inner = innerWallDimensions(wallWidth, wallHeight);
  const end = endWallDimensions(wallWidth, wallHeight);
  const gap = WALL_GAP;

  const main: WallSlotLayout = {
    x: 0,
    y: wallHeight * 0.5,
    width: wallWidth,
    height: wallHeight,
  };

  const leftInner: WallSlotLayout = {
    x: -wallWidth * 0.5 - gap - inner.width * 0.5,
    y: inner.height * 0.5,
    width: inner.width,
    height: inner.height,
  };

  const leftEnd: WallSlotLayout = {
    x: leftInner.x - inner.width * 0.5 - gap - end.width * 0.5,
    y: end.height * 0.5,
    width: end.width,
    height: end.height,
  };

  const rightInner: WallSlotLayout = {
    x: wallWidth * 0.5 + gap + inner.width * 0.5,
    y: inner.height * 0.5,
    width: inner.width,
    height: inner.height,
  };

  const rightEnd: WallSlotLayout = {
    x: rightInner.x + inner.width * 0.5 + gap + end.width * 0.5,
    y: end.height * 0.5,
    width: end.width,
    height: end.height,
  };

  return { leftEnd, leftInner, main, rightInner, rightEnd };
}

/** Downstage tower X for L/R rigs (just outside the outermost side walls). */
export function stageRigTowerX(
  wallWidth: number,
  wallHeight: number,
  includeSides: boolean,
  outward = 1,
): { leftX: number; rightX: number } {
  if (!includeSides) {
    const half = wallWidth * 0.5;
    return { leftX: -half - outward, rightX: half + outward };
  }
  const row = straightWallRowLayout(wallWidth, wallHeight);
  const leftEdge = row.leftEnd.x - row.leftEnd.width * 0.5;
  const rightEdge = row.rightEnd.x + row.rightEnd.width * 0.5;
  return { leftX: leftEdge - outward, rightX: rightEdge + outward };
}

export type SideScreenRole = 'midL' | 'sideL' | 'sideR' | 'midR';

/** One sides feed split across all four side walls by physical width. */
export function sidesMediaUvCrops(
  wallWidth: number,
  wallHeight: number,
): Record<SideScreenRole, MediaUvCrop> {
  const row = straightWallRowLayout(wallWidth, wallHeight);
  const segments: Array<{ role: SideScreenRole; width: number }> = [
    { role: 'midL', width: row.leftEnd.width },
    { role: 'sideL', width: row.leftInner.width },
    { role: 'sideR', width: row.rightInner.width },
    { role: 'midR', width: row.rightEnd.width },
  ];
  const totalW = segments.reduce((s, seg) => s + seg.width, 0);

  let u = 0;
  const crops = {} as Record<SideScreenRole, MediaUvCrop>;
  for (const seg of segments) {
    const uScale = seg.width / totalW;
    crops[seg.role] = {
      offset: new THREE.Vector2(u, 0),
      scale: new THREE.Vector2(uScale, 1),
    };
    u += uScale;
  }
  return crops;
}
