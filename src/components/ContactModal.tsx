import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent, ReactNode } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';

/** Web3Forms access key. Public by design — it only permits submissions. */
const ACCESS_KEY = '9177aa22-e937-4606-86d0-13289bffae22';
const ENDPOINT = 'https://api.web3forms.com/submit';

type Status = 'idle' | 'sending' | 'success' | 'error';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY = {
  name: '',
  email: '',
  company: '',
  message: '',
  services: [] as string[],
  deliverables: [] as string[],
  budget: '',
  timeline: '',
};

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-start text-xs font-light leading-tight transition-colors duration-150 sm:text-sm ${
        selected
          ? 'border-transparent bg-[#D7E2EA] text-[#0C0C0C]'
          : 'border-[#D7E2EA]/25 text-[#D7E2EA] hover:border-[#D7E2EA]/60'
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[#D7E2EA]/70">
        {label}
        {hint && <span className="ms-2 normal-case tracking-normal opacity-60">({hint})</span>}
      </span>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-[#D7E2EA]/20 bg-[#0C0C0C] px-4 py-3 text-sm font-light text-[#D7E2EA] outline-none transition-colors duration-150 placeholder:text-[#D7E2EA]/30 focus:border-[#D7E2EA]/60';

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const { t, lang } = useLanguage();
  const c = t.contact;

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<Status>('idle');

  // Escape to dismiss, and freeze the page behind the dialog.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const toggle = (key: 'services' | 'deliverables', value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));

  const pick = (key: 'budget' | 'timeline', value: string) =>
    setForm((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');

    const data = new FormData();
    data.append('access_key', ACCESS_KEY);
    data.append('subject', `New project request — ${form.name}`);
    data.append('from_name', 'ipekdogru.vercel.app');
    data.append('name', form.name);
    data.append('email', form.email);
    if (form.company) data.append('Company', form.company);
    data.append('Services', form.services.join(', ') || '—');
    data.append('Deliverables', form.deliverables.join(', ') || '—');
    data.append('Budget', form.budget || '—');
    data.append('Timeline', form.timeline || '—');
    data.append('message', form.message);
    data.append('Site language', lang.toUpperCase());

    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: data });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
        setForm(EMPTY);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  // Reopening after a send should present a blank form, not the receipt.
  const handleClose = () => {
    onClose();
    setTimeout(() => setStatus('idle'), 300);
  };

  // Rendered into <body>: the button lives inside the hero's z-20 layer, so an
  // in-place dialog would stack below the z-30 portrait no matter its z-index —
  // and FadeIn's transform would make `position: fixed` resolve against the
  // wrapper instead of the viewport.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={c.title}
            className="relative w-full max-w-2xl rounded-[28px] border border-[#D7E2EA]/15 bg-[#141414] p-6 shadow-2xl shadow-black/60 sm:p-9"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label={c.close}
              className="absolute end-5 top-5 text-[#D7E2EA]/60 transition-colors duration-150 hover:text-[#D7E2EA]"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {status === 'success' ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D7E2EA]">
                  <Check className="h-7 w-7 text-[#0C0C0C]" strokeWidth={2.5} />
                </span>
                <h2 className="text-2xl font-medium text-[#D7E2EA]">{c.successTitle}</h2>
                <p className="max-w-sm text-sm font-light leading-relaxed text-[#D7E2EA]/60">
                  {c.successBody}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 rounded-full border border-[#D7E2EA]/30 px-8 py-2.5 text-xs font-medium uppercase tracking-widest text-[#D7E2EA] transition-colors duration-150 hover:bg-[#D7E2EA]/10"
                >
                  {c.close}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-7">
                <header className="flex flex-col gap-2 pe-8">
                  <h2 className="text-2xl font-medium leading-tight text-[#D7E2EA] sm:text-3xl">
                    {c.title}
                  </h2>
                  <p className="text-sm font-light text-[#D7E2EA]/55">{c.subtitle}</p>
                </header>

                <Field label={c.servicesLabel} hint={c.multiHint}>
                  <div className="flex flex-wrap gap-2">
                    {t.services.items.map((item) => (
                      <Chip
                        key={item.name}
                        label={item.name}
                        selected={form.services.includes(item.name)}
                        onClick={() => toggle('services', item.name)}
                      />
                    ))}
                  </div>
                </Field>

                <Field label={c.deliverables.label} hint={c.multiHint}>
                  <div className="flex flex-wrap gap-2">
                    {c.deliverables.options.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        selected={form.deliverables.includes(option)}
                        onClick={() => toggle('deliverables', option)}
                      />
                    ))}
                  </div>
                </Field>

                <div className="grid gap-7 sm:grid-cols-2">
                  <Field label={c.budget.label}>
                    <div className="flex flex-wrap gap-2">
                      {c.budget.options.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          selected={form.budget === option}
                          onClick={() => pick('budget', option)}
                        />
                      ))}
                    </div>
                  </Field>

                  <Field label={c.timeline.label}>
                    <div className="flex flex-wrap gap-2">
                      {c.timeline.options.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          selected={form.timeline === option}
                          onClick={() => pick('timeline', option)}
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={c.nameLabel}>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={c.namePlaceholder}
                      className={inputClass}
                    />
                  </Field>

                  <Field label={c.emailLabel}>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder={c.emailPlaceholder}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label={c.companyLabel} hint={c.optional}>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                    placeholder={c.companyPlaceholder}
                    className={inputClass}
                  />
                </Field>

                <Field label={c.messageLabel}>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder={c.messagePlaceholder}
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                {/* Honeypot: bots fill every field they find, humans never see this. */}
                <input
                  type="checkbox"
                  name="botcheck"
                  className="hidden"
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {status === 'error' && (
                  <p className="text-sm font-light text-[#FF8A8A]">{c.errorText}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="rounded-full px-10 py-3.5 text-sm font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                  style={{
                    background:
                      'linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)',
                    boxShadow:
                      '0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset',
                    outline: '2px solid #FFFFFF',
                    outlineOffset: '-3px',
                  }}
                >
                  {status === 'sending' ? c.sending : c.submit}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
