import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import ContactModal from './ContactModal';
import ShinyButton from './ShinyButton';

interface ContactButtonProps {
  className?: string;
}

export default function ContactButton({ className = '' }: ContactButtonProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <ShinyButton
        onClick={() => setOpen(true)}
        className={`shrink-0 whitespace-nowrap px-8 py-3 text-xs sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base ${className}`}
      >
        {t.buttons.contact}
      </ShinyButton>

      <ContactModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
