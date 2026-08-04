import { useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import ContactDropdown from './ContactDropdown';
import ShinyButton from './ShinyButton';

interface ContactButtonProps {
  className?: string;
}

export default function ContactButton({ className = '' }: ContactButtonProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  // ShinyButton is a motion.button and forwards no ref, so the wrapper is what
  // the panel measures against.
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  return (
    <>
      <span ref={anchorRef} className="inline-block">
        <ShinyButton
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`shrink-0 whitespace-nowrap px-8 py-3 text-xs sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base ${className}`}
        >
          {t.buttons.contact}
        </ShinyButton>
      </span>

      <ContactDropdown
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
      />
    </>
  );
}
