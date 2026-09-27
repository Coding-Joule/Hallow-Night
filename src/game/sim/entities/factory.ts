import type { LevelObject } from '../../levels/schema';
import type { Entity } from '../Entity';
import { Bat, Ghost, Raven, Shadow, Walker } from './enemies';
import { Chaser, FallingHazard, MovingHazard, Pendulum, Sludge, Spikes } from './hazards';
import {
  Button,
  Checkpoint,
  Gate,
  KeyItem,
  Lever,
  LockedDoor,
  PressurePlate,
  Relic,
  Sign,
  Spring,
  TimedSwitch,
} from './interactive';
import { CrumblingPlatform, Elevator, FallingPlatform, MovingPlatform, PathPlatform, TimedPlatform } from './platforms';
import { BreakableWall, Conveyor, HiddenWall, Slope, StaticSolid } from './terrain';

/** Map a level object to its simulation entity. Decorations return null. */
export function createEntity(obj: LevelObject): Entity | null {
  switch (obj.type) {
    case 'ground':
    case 'platform':
    case 'oneWay':
      return new StaticSolid(obj);
    case 'slope':
      return new Slope(obj);
    case 'conveyor':
      return new Conveyor(obj);
    case 'movingPlatform':
      return new MovingPlatform(obj);
    case 'pathPlatform':
      return new PathPlatform(obj);
    case 'fallingPlatform':
      return new FallingPlatform(obj);
    case 'crumblingPlatform':
      return new CrumblingPlatform(obj);
    case 'timedPlatform':
      return new TimedPlatform(obj);
    case 'elevator':
      return new Elevator(obj);
    case 'spikes':
      return new Spikes(obj);
    case 'pendulum':
      return new Pendulum(obj);
    case 'fallingHazard':
      return new FallingHazard(obj);
    case 'movingHazard':
      return new MovingHazard(obj);
    case 'sludge':
      return new Sludge(obj);
    case 'chaser':
      return new Chaser(obj);
    case 'pressurePlate':
      return new PressurePlate(obj);
    case 'lever':
      return new Lever(obj);
    case 'button':
      return new Button(obj);
    case 'timedSwitch':
      return new TimedSwitch(obj);
    case 'gate':
      return new Gate(obj);
    case 'lockedDoor':
      return new LockedDoor(obj);
    case 'key':
      return new KeyItem(obj);
    case 'checkpoint':
      return new Checkpoint(obj);
    case 'breakableWall':
      return new BreakableWall(obj);
    case 'hiddenWall':
      return new HiddenWall(obj);
    case 'spring':
      return new Spring(obj);
    case 'ghost':
      return new Ghost(obj);
    case 'skeleton':
      return new Walker(obj, true);
    case 'armoredSkeleton':
      return new Walker(obj, false);
    case 'bat':
      return new Bat(obj);
    case 'raven':
      return new Raven(obj);
    case 'shadow':
      return new Shadow(obj);
    case 'relic':
      return new Relic(obj);
    case 'sign':
      return new Sign(obj);
    case 'decoration':
      return null;
  }
}
