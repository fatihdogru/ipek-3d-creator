import { LanguageProvider } from './i18n/LanguageProvider';
import AboutSection from './sections/AboutSection';
import HeroSection from './sections/HeroSection';
import MarqueeSection from './sections/MarqueeSection';
import ProjectsSection from './sections/ProjectsSection';
import ServicesSection from './sections/ServicesSection';

export default function App() {
  return (
    <LanguageProvider>
      <main className="bg-[#0C0C0C]" style={{ overflowX: 'clip' }}>
        <HeroSection />
        <MarqueeSection />
        <AboutSection />
        <ServicesSection />
        <ProjectsSection />
      </main>
    </LanguageProvider>
  );
}
