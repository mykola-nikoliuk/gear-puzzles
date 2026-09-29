/** The curriculum the author model writes levels for, easiest first. */
export const BRIEFS = [
  'An idler gear between two gears of the same size: the direction flips, the speed does not.',
  'Speed up: a big gear driving a small one makes the output turn faster than the motor.',
  'Slow down: small gears driving big ones, two meshes in a row.',
  'The first compound gear: two gears stacked on one axle turn together.',
  'The output must turn the same way as the motor; count the meshes.',
  'Decoys that look right: a spare gear that gives the right speed in the wrong direction.',
  'Two compound stages for a big reduction, 1/16 of the motor speed or slower.',
  'A compound gear that speeds up: the output turns faster than the motor.',
] as const;
