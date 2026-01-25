import type { MotionValue } from "framer-motion";

export interface DeckMotion {
  activeNavOpacity: MotionValue<number>;
  activeNavScale: MotionValue<number>;
  dismissBlur: MotionValue<number>;
  nextOpacity: MotionValue<number>;
  nextScale: MotionValue<number>;
  prevOpacity: MotionValue<number>;
  prevScale: MotionValue<number>;
  transitionOpacity: MotionValue<number>;
  transitionScale: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}
