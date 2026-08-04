import StarCursor from './components/StarCursor';
import { LanguageProvider } from './i18n/LanguageProvider';
import AboutSection from './sections/AboutSection';
import BreakdownSection from './sections/BreakdownSection';
import GallerySection from './sections/GallerySection';
import HeroSection from './sections/HeroSection';
import ProjectsSection from './sections/ProjectsSection';

export default function App() {
  return (
    <LanguageProvider>
      <main className="bg-black" style={{ overflowX: 'clip' }}>
        <HeroSection />
        <GallerySection />
        <ProjectsSection />
        <BreakdownSection />
        <AboutSection />
      </main>

      {/* Outside <main>: its `overflow-x: clip` would risk clipping a fixed
          overlay, and the cursor has to reach every corner of the viewport.
          It only takes over inside About; elsewhere the native cursor stays. */}
      <StarCursor targetId="about" />
    </LanguageProvider>
  );
}
