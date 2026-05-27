/** Stage depth: audience at +Z, LED wall upstage at -Z */
export const STAGE = {
  /** LED wall plane sits here (back of stage) */
  wallZ: -5,
  /** Riser (downstage, toward cameras) */
  riserZ: 2.5,
  /** Riser depth (front to back) */
  riserDepth: 4.5,
  riserHeight: 0.45,
  /** Stage deck (meters, X × Z) */
  floorWidth: 90,
  floorDepth: 64,
  /** Point all LED faces toward congregation */
  audienceFocus: { x: 0, y: 4, z: 14 },
} as const;
