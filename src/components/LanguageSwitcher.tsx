import { Check, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { LANGUAGES } from '../i18n/translations';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-[#D7E2EA] transition-opacity duration-200 hover:opacity-70 md:gap-2 md:text-lg lg:text-[1.4rem]"
      >
        <Globe className="h-[1.15em] w-[1.15em]" strokeWidth={1.75} />
        {active.short}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute end-0 z-50 mt-3 min-w-[9.5rem] overflow-hidden rounded-2xl border border-[#D7E2EA]/25 bg-[#141414] py-1 shadow-2xl shadow-black/60"
        >
          {LANGUAGES.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                role="option"
                aria-selected={option.code === lang}
                onClick={() => {
                  setLang(option.code);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-4 px-4 py-2 text-start text-sm font-light text-[#D7E2EA] transition-colors duration-150 hover:bg-[#D7E2EA]/10"
              >
                {option.label}
                {option.code === lang && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
