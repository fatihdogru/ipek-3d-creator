import { useLayoutEffect, useRef } from 'react';
import ContactButton from '../components/ContactButton';
import FadeIn from '../components/FadeIn';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Magnet from '../components/Magnet';
import { useLanguage } from '../i18n/LanguageProvider';
import portraitSrc from '../assets/portrait.png';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4';

/**
 * The headline is a single nowrap line sized in vw, so a longer translation
 * ("Hallo, ich bin ipek" vs "Hi, i'm ipek") would overflow. Measure it and
 * shrink the font until it fits its container.
 */
function useFitHeadline(text: string, scale = 1) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = '';
      const base = parseFloat(window.getComputedStyle(el).fontSize) * scale;
      el.style.fontSize = `${base}px`;

      const available = el.parentElement?.clientWidth ?? 0;
      const actual = el.scrollWidth;
      if (available > 0 && actual > available) {
        el.style.fontSize = `${base * (available / actual)}px`;
      }
    };

    fit();
    // Webfont swap changes metrics after first paint.
    document.fonts?.ready.then(fit).catch(() => {});
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [text, scale]);

  return ref;
}

export default function HeroSection() {
  const { t } = useLanguage();
  const headingRef = useFitHeadline(t.hero.title, t.heroScale ?? 1);

  return (
    <section
      className="relative flex h-screen flex-col bg-[#0C0C0C]"
      style={{ overflowX: 'clip' }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full object-cover"
          src={HERO_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        {/* Keeps the headline and body copy legible over the footage. */}
        <div className="absolute inset-0 bg-[#0C0C0C]/55" />
      </div>

      <FadeIn
        as="nav"
        delay={0}
        y={-20}
        className="relative z-40 flex justify-end px-6 pt-6 md:px-10 md:pt-8"
      >
        <LanguageSwitcher />
      </FadeIn>

      {/* overflow-x only: `overflow-hidden` with `leading-none` clips the dot
          off Turkish İ, which sits above the 1em line box. */}
      <div className="relative z-20 overflow-x-clip">
        <FadeIn delay={0.15} y={40}>
          <h1
            ref={headingRef}
            /* pt scales with the headline: leaves room for glyphs that rise
               above the 1em line box (Turkish İ dot, Arabic marks). */
            className="hero-heading mt-6 w-full whitespace-nowrap pt-[0.16em] text-center text-[14vw] font-black uppercase leading-none tracking-tight sm:mt-4 sm:text-[15vw] md:-mt-5 md:text-[16vw] lg:text-[17.5vw]"
          >
            {t.hero.title}
          </h1>
        </FadeIn>
      </div>

      <div className="relative z-20 mt-auto flex items-end justify-between gap-4 px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
        <FadeIn delay={0.35} y={20}>
          <p
            className="max-w-[160px] font-light uppercase leading-snug tracking-wide text-[#D7E2EA] sm:max-w-[220px] md:max-w-[260px]"
            style={{ fontSize: 'clamp(0.75rem, 1.4vw, 1.5rem)' }}
          >
            {t.hero.tagline}
          </p>
        </FadeIn>

        <FadeIn delay={0.5} y={20}>
          <ContactButton />
        </FadeIn>
      </div>

      {/* Centering lives on this wrapper: FadeIn writes an inline transform that
          would otherwise clobber the -translate-x-1/2 utility. */}
      <div className="absolute left-1/2 top-1/2 z-30 w-[280px] -translate-x-1/2 -translate-y-1/2 sm:bottom-0 sm:top-auto sm:w-[360px] sm:translate-y-0 md:w-[440px] lg:w-[520px]">
        <FadeIn delay={0.6} y={30}>
          <Magnet
            padding={150}
            strength={3}
            activeTransition="transform 0.3s ease-out"
            inactiveTransition="transform 0.6s ease-in-out"
          >
            <img
              src={portraitSrc}
              alt="Ipek, 3D creator"
              className="w-full select-none"
              draggable={false}
            />
          </Magnet>
        </FadeIn>
      </div>
    </section>
  );
}
