import { useCallback, useState } from 'react';
import FluidRevealBackground from './FluidRevealBackground';
import ImageRevealBackground from './ImageRevealBackground';

/**
 * The fluid reveal needs WebGL2 with float render targets. Where that is
 * missing — or the context fails to come up — we fall back to the canvas
 * simplex-noise blob, which needs nothing beyond 2D canvas.
 */
export default function RevealBackground({
  base,
  reveal,
}: {
  base: string;
  reveal: string;
}) {
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  if (failed) return <ImageRevealBackground base={base} reveal={reveal} />;
  return <FluidRevealBackground base={base} reveal={reveal} onFail={onFail} />;
}
