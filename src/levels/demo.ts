import { fraction } from '../core/fraction';
import type { GearSystem } from '../core/model';

/**
 * A small hand-made train: the motor drives an idler and a compound gear,
 * whose small half passes the rotation up to the second layer.
 * Two spare axles leave room to rearrange the gears.
 */
export const demoLevel: GearSystem = {
  axles: [
    { id: 'motor', x: 0, y: 0 },
    { id: 'idler', x: -6, y: 8 },
    { id: 'compound', x: 18, y: 0 },
    { id: 'output', x: 27, y: 12 },
    { id: 'spare-south', x: 0, y: -10 },
    { id: 'spare-west', x: -16, y: -4 },
  ],
  gears: [
    { id: 'motor-gear', axleId: 'motor', teeth: 12, layer: 0 },
    { id: 'idler-gear', axleId: 'idler', teeth: 8, layer: 0 },
    { id: 'compound-big', axleId: 'compound', teeth: 24, layer: 0 },
    { id: 'compound-small', axleId: 'compound', teeth: 10, layer: 1 },
    { id: 'output-gear', axleId: 'output', teeth: 20, layer: 1 },
  ],
  driver: { axleId: 'motor', velocity: fraction(1, 4) },
};
