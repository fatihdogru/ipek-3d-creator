import BackgroundPixelStars from '@/components/ui/background-pixel-stars';
import AnimatedText from '../components/AnimatedText';
import ContactButton from '../components/ContactButton';
import FadeIn from '../components/FadeIn';
import { useLanguage } from '../i18n/LanguageProvider';

/** The 2x2 dither tile the starfield demo sits on. */
const PIXEL_TILE =
  "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIElEQVR42mIUEhJiwAbevXuHVZyJgUQwqmEUDB0AEGAADd8DEPTX6ksAAAAASUVORK5CYII=')";

export default function AboutSection() {
  const { lang, t } = useLanguage();

  return (
    <section
      id="about"
      /* Same lift-and-round seam Services and Projects use on each other, so
         the closing section joins the stack the way the rest of the page does. */
      className="relative z-20 -mt-10 flex min-h-screen items-center justify-center overflow-hidden rounded-t-[40px] bg-black px-5 py-20 sm:-mt-12 sm:rounded-t-[50px] sm:px-8 md:-mt-14 md:rounded-t-[60px] md:px-10"
    >
      {/* The starfield canvas is `fixed inset-0`, which would otherwise ignore
          this section's bounds and paint over the whole page. `contain: paint`
          makes this wrapper the containing block for fixed descendants and
          clips them to it, so the starfield stays inside About. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ contain: 'paint', backgroundImage: PIXEL_TILE, backgroundSize: '10px' }}
      >
        <BackgroundPixelStars />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-16 sm:gap-20 md:gap-24">
        <div className="flex flex-col items-center gap-10 sm:gap-14 md:gap-16">
          <FadeIn delay={0} y={40}>
            <h2
              className="hero-heading text-center font-black uppercase leading-none tracking-tight"
              style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
            >
              {t.about.title}
            </h2>
          </FadeIn>

          <AnimatedText
            key={lang}
            text={t.about.body}
            perWord={lang === 'ar'}
            className="max-w-[560px] text-center font-medium leading-relaxed text-[#D7E2EA]"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)' }}
          />
        </div>

        <ContactButton />
      </div>
    </section>
  );
}
