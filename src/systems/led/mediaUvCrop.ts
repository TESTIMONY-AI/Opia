import * as THREE from 'three';

/** Maps wall UV (0–1) into a region of the source texture. */
export interface MediaUvCrop {
  offset: THREE.Vector2;
  scale: THREE.Vector2;
}

export const MEDIA_UV_FULL: MediaUvCrop = {
  offset: new THREE.Vector2(0, 0),
  scale: new THREE.Vector2(1, 1),
};

/** One wide side feed: left physical wall = left half of texture. */
export const MEDIA_UV_SIDE_LEFT: MediaUvCrop = {
  offset: new THREE.Vector2(0, 0),
  scale: new THREE.Vector2(0.5, 1),
};

/** One wide side feed: right physical wall = right half of texture. */
export const MEDIA_UV_SIDE_RIGHT: MediaUvCrop = {
  offset: new THREE.Vector2(0.5, 0),
  scale: new THREE.Vector2(0.5, 1),
};

/** UV sub-rectangle for one cell in a cols×rows grid over a media region. */
export function mediaUvCropForCell(
  region: MediaUvCrop,
  col: number,
  row: number,
  cols: number,
  rows: number,
): MediaUvCrop {
  return {
    offset: new THREE.Vector2(
      region.offset.x + (region.scale.x * col) / cols,
      region.offset.y + (region.scale.y * row) / rows,
    ),
    scale: new THREE.Vector2(region.scale.x / cols, region.scale.y / rows),
  };
}
