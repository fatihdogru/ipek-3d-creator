import FluidPage from '../components/reveal/FluidPage';
import ScrollWipe from '../components/reveal/ScrollWipe';
import { FLUID_PAGES } from '../components/reveal/images';

/**
 * Behind-the-scenes: drag the edge to take a drawing through to its render,
 * then wipe each raw scene back to its finished frame with the cursor.
 */
export default function BreakdownSection() {
  return (
    <>
      <ScrollWipe />
      {FLUID_PAGES.map((pair, i) => (
        <FluidPage
          key={pair.base}
          pair={pair}
          index={i + 1}
          total={FLUID_PAGES.length}
        />
      ))}
    </>
  );
}
