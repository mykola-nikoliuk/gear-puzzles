import * as THREE from 'three';

/** Board units between the grooves a lathe leaves on a turned face. */
const GROOVE_SPACING = 0.12;
const TEXTURE_SIZE = 256;

/**
 * A square roughness map of a turned metal face spanning `radius` from the centre:
 * concentric grooves, each a little rougher or smoother than the next. Values are 0–255;
 * every point at the same distance from the centre gets the same value.
 */
export function turnedGrooves(radius: number, size = TEXTURE_SIZE): Uint8Array {
  const data = new Uint8Array(size * size);
  const half = size / 2;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const distance = (Math.hypot(column + 0.5 - half, row + 0.5 - half) / half) * radius;
      const groove = distance / GROOVE_SPACING;
      // A stable pseudo-random shade per groove, plus a soft ridge inside each one.
      const shade = Math.abs(Math.sin(Math.floor(groove) * 12.9898) * 43758.5453) % 1;
      const ridge = Math.sin((groove % 1) * Math.PI);
      data[row * size + column] = Math.round(140 + 70 * shade + 45 * ridge);
    }
  }
  return data;
}

const textureCache = new Map<number, THREE.DataTexture>();

/**
 * The turned-metal roughness map for a gear of `radius`. Gear faces take their UVs from the
 * shape's own coordinates, so the map is scaled to span −radius…radius around the axle.
 */
export function turnedTexture(radius: number): THREE.DataTexture {
  const cached = textureCache.get(radius);
  if (cached) return cached;

  // Roughness reads the green channel; a single red channel would leave it at zero.
  const grooves = turnedGrooves(radius);
  const rgba = new Uint8Array(grooves.length * 4);
  grooves.forEach((value, i) => rgba.fill(value, i * 4, i * 4 + 3).fill(255, i * 4 + 3, i * 4 + 4));
  const texture = new THREE.DataTexture(rgba, TEXTURE_SIZE, TEXTURE_SIZE);
  texture.repeat.set(1 / (2 * radius), 1 / (2 * radius));
  texture.offset.set(0.5, 0.5);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureCache.set(radius, texture);
  return texture;
}
