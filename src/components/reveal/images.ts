import wipeSketch from '../../assets/reveal/wipe-sketch.webp';
import wipeRender from '../../assets/reveal/wipe-render.webp';
import page1Lit from '../../assets/reveal/page1-lit.webp';
import page1Raw from '../../assets/reveal/page1-raw.webp';
import page2Lit from '../../assets/reveal/page2-lit.webp';
import page2Raw from '../../assets/reveal/page2-raw.webp';
import page3Lit from '../../assets/reveal/page3-lit.webp';
import page3Raw from '../../assets/reveal/page3-raw.webp';

// The dragged wipe: the drawn version, and the photoreal render behind it.
export const WIPE_BASE = wipeSketch;
export const WIPE_REVEAL = wipeRender;

export type ImagePair = {
  /** Always on screen. */
  base: string;
  /** Uncovered inside the fluid trail. */
  reveal: string;
};

// Each pair is one full-screen page: the raw scene, and the finished frame that
// the cursor uncovers inside its trail.
export const FLUID_PAGES: ImagePair[] = [
  { base: page1Raw, reveal: page1Lit },
  { base: page2Raw, reveal: page2Lit },
  { base: page3Raw, reveal: page3Lit },
];
