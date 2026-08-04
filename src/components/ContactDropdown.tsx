import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Variants } from 'framer-motion';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { CONTACT_EMAIL, VISIBLE_SOCIAL_LINKS } from '../config/contact';
import { useLanguage } from '../i18n/LanguageProvider';
import EyeTracking from './EyeTracking';
import ShinyButton from './ShinyButton';

/** Web3Forms access key. Public by design — it only permits submissions. */
const ACCESS_KEY = '9177aa22-e937-4606-86d0-13289bffae22';
const ENDPOINT = 'https://api.web3forms.com/submit';

const PANEL_WIDTH = 460;
const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 12;

/** Below this much free space the panel stops hanging off the button. */
const MIN_DROP_HEIGHT = 340;
const MAX_PANEL_HEIGHT = 620;

type Status = 'idle' | 'sending' | 'success' | 'error';

interface ContactDropdownProps {
  open: boolean;
  onClose: () => void;
  /** The trigger the panel hangs from. */
  anchorRef: RefObject<HTMLElement | null>;
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

interface Placement {
  left: number;
  width: number;
  maxHeight: number;
  /** Anchored below, anchored above, or floated when neither side fits. */
  dir: 'down' | 'up' | 'center';
  top?: number;
  bottom?: number;
  /** Notch offset within the panel, so it keeps pointing at the trigger. */
  notchX: number;
}

/**
 * Hangs the panel off the trigger, flipping above it when the space below runs
 * out and floating it when neither side can hold it (short viewports).
 */
function place(anchor: HTMLElement | null): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(PANEL_WIDTH, vw - VIEWPORT_MARGIN * 2);

  const rect = anchor?.getBoundingClientRect();
  if (!rect) {
    return {
      left: (vw - width) / 2,
      width,
      maxHeight: vh - VIEWPORT_MARGIN * 2,
      dir: 'center',
      top: VIEWPORT_MARGIN,
      notchX: width / 2,
    };
  }

  const below = vh - rect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
  const above = rect.top - ANCHOR_GAP - VIEWPORT_MARGIN;

  let dir: Placement['dir'] =
    below >= MIN_DROP_HEIGHT || below >= above ? 'down' : 'up';
  let maxHeight = dir === 'down' ? below : above;

  if (maxHeight < MIN_DROP_HEIGHT) {
    dir = 'center';
    maxHeight = vh - VIEWPORT_MARGIN * 2;
  }
  maxHeight = Math.min(maxHeight, MAX_PANEL_HEIGHT);

  const centerX = rect.left + rect.width / 2;
  const left = Math.min(
    Math.max(centerX - width / 2, VIEWPORT_MARGIN),
    Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN),
  );

  return {
    left,
    width,
    maxHeight,
    dir,
    top:
      dir === 'down'
        ? rect.bottom + ANCHOR_GAP
        : dir === 'center'
          ? (vh - maxHeight) / 2
          : undefined,
    bottom: dir === 'up' ? vh - rect.top + ANCHOR_GAP : undefined,
    notchX: Math.min(Math.max(centerX - left, 28), width - 28),
  };
}

const listMotion: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.06 } },
};

const itemMotion: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

/**
 * A select that expands in place rather than floating: the panel body scrolls,
 * and an absolutely positioned menu would be clipped by that scroll container.
 */
function Select({
  options,
  selected,
  placeholder,
  multiple,
  expanded,
  onToggleExpanded,
  onPick,
}: {
  options: readonly string[];
  selected: string[];
  placeholder: string;
  multiple: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onPick: (value: string) => void;
}) {
  const summary = selected.length > 0 ? selected.join(', ') : placeholder;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-[#0A0A0A] transition-colors duration-150 ${
        expanded ? 'border-[#D7E2EA]/45' : 'border-[#D7E2EA]/15'
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-start"
      >
        <span
          className={`min-w-0 flex-1 truncate text-[13px] font-light ${
            selected.length > 0 ? 'text-[#D7E2EA]' : 'text-[#D7E2EA]/30'
          }`}
        >
          {summary}
        </span>
        {selected.length > 1 && (
          <span className="shrink-0 rounded-full bg-[#D7E2EA]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#D7E2EA]/80">
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#D7E2EA]/50 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ul className="max-h-52 overflow-y-auto border-t border-[#D7E2EA]/10 py-1">
              {options.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <li key={option}>
                    <button
                      type="button"
                      role={multiple ? 'checkbox' : 'radio'}
                      aria-checked={isSelected}
                      onClick={() => onPick(option)}
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-start text-[12px] font-light leading-snug transition-colors duration-100 hover:bg-[#D7E2EA]/[0.07] ${
                        isSelected ? 'text-[#D7E2EA]' : 'text-[#D7E2EA]/65'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors duration-100 ${
                          multiple ? 'rounded-[4px]' : 'rounded-full'
                        } ${
                          isSelected
                            ? 'border-[#D7E2EA] bg-[#D7E2EA]'
                            : 'border-[#D7E2EA]/30'
                        }`}
                      >
                        {isSelected &&
                          (multiple ? (
                            <Check
                              className="h-2.5 w-2.5 text-[#0C0C0C]"
                              strokeWidth={3.5}
                            />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0C0C0C]" />
                          ))}
                      </span>
                      {option}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <motion.div variants={itemMotion} className="flex flex-col gap-2.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#D7E2EA]/55">
        {label}
        {hint && (
          <span className="ms-2 normal-case tracking-normal opacity-70">
            ({hint})
          </span>
        )}
      </span>
      {children}
    </motion.div>
  );
}

const inputClass =
  'w-full rounded-xl border border-[#D7E2EA]/15 bg-[#0A0A0A] px-3.5 py-2.5 text-[13px] font-light text-[#D7E2EA] outline-none transition-colors duration-150 placeholder:text-[#D7E2EA]/25 focus:border-[#D7E2EA]/55';

export default function ContactDropdown({
  open,
  onClose,
  anchorRef,
}: ContactDropdownProps) {
  const { t, lang } = useLanguage();
  const c = t.contact;

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const [placement, setPlacement] = useState<Placement | null>(null);
  // One question open at a time, so the brief never becomes a wall of options.
  const [expanded, setExpanded] = useState<string | null>(null);

  const expand = (key: string) =>
    setExpanded((prev) => (prev === key ? null : key));

  const reposition = useCallback(() => {
    setPlacement(place(anchorRef.current));
  }, [anchorRef]);

  // Measure before paint so the panel never flashes in the wrong corner.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  // Escape to dismiss, and freeze the page so the panel stays on its trigger.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', reposition);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', reposition);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, reposition]);

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

  const p = placement;

  // Rendered into <body>: the trigger sits inside the hero's z-20 layer, so an
  // in-place panel would stack below the z-30 portrait no matter its z-index —
  // and FadeIn's transform would make `position: fixed` resolve against the
  // wrapper instead of the viewport.
  return createPortal(
    <AnimatePresence>
      {open && p && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={handleClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={c.title}
            className="fixed z-[101] flex flex-col overflow-hidden rounded-3xl border border-[#D7E2EA]/15 bg-[#101010] shadow-2xl shadow-black/70"
            style={{
              left: p.left,
              top: p.top,
              bottom: p.bottom,
              width: p.width,
              maxHeight: p.maxHeight,
              transformOrigin: `${p.notchX}px ${p.dir === 'up' ? '100%' : '0%'}`,
            }}
            initial={{ opacity: 0, scaleY: 0.9, y: p.dir === 'up' ? 10 : -10 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.95, y: p.dir === 'up' ? 8 : -8 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 32,
              mass: 0.7,
            }}
          >
            {/* Notch: keeps the panel visually tied to the button it came from. */}
            {p.dir !== 'center' && (
              <span
                aria-hidden="true"
                className="absolute h-3 w-3 rotate-45 border-[#D7E2EA]/15 bg-[#101010]"
                style={{
                  left: p.notchX - 6,
                  ...(p.dir === 'down'
                    ? { top: -6, borderTopWidth: 1, borderLeftWidth: 1 }
                    : {
                        bottom: -6,
                        borderBottomWidth: 1,
                        borderRightWidth: 1,
                      }),
                }}
              />
            )}

            {status === 'success' ? (
              <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D7E2EA]">
                  <Check className="h-6 w-6 text-[#0C0C0C]" strokeWidth={2.5} />
                </span>
                <h2 className="text-xl font-medium text-[#D7E2EA]">
                  {c.successTitle}
                </h2>
                <p className="max-w-xs text-[13px] font-light leading-relaxed text-[#D7E2EA]/60">
                  {c.successBody}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-1 rounded-full border border-[#D7E2EA]/25 px-7 py-2 text-[11px] font-medium uppercase tracking-widest text-[#D7E2EA] transition-colors duration-150 hover:bg-[#D7E2EA]/10"
                >
                  {c.close}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
                {/* Header: the eyes stay, at dropdown scale. */}
                <div className="flex shrink-0 items-start gap-3.5 border-b border-[#D7E2EA]/10 px-5 py-4">
                  <EyeTracking
                    className="mt-0.5 shrink-0 justify-start"
                    eyeSize={34}
                    gap={8}
                    variant="realistic"
                    irisColor="#5A3A1E"
                    irisColorSecondary="#9A6B3F"
                    pupilColor="#100A06"
                    scleraColor="#F2ECE4"
                    blinkInterval={4500}
                  />

                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-semibold uppercase leading-tight tracking-wide text-[#D7E2EA]">
                      {c.title}
                    </h2>
                    <p className="mt-1 text-[11px] font-light leading-snug text-[#D7E2EA]/50">
                      {c.subtitle}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label={c.close}
                    className="-me-1 -mt-1 shrink-0 rounded-full p-1.5 text-[#D7E2EA]/50 transition-colors duration-150 hover:bg-[#D7E2EA]/10 hover:text-[#D7E2EA]"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Brief: the only part that scrolls. */}
                <motion.div
                  variants={listMotion}
                  initial="hidden"
                  animate="show"
                  className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
                >
                  <Field label={c.servicesLabel} hint={c.multiHint}>
                    <Select
                      options={t.services.items.map((item) => item.name)}
                      selected={form.services}
                      placeholder={c.choose}
                      multiple
                      expanded={expanded === 'services'}
                      onToggleExpanded={() => expand('services')}
                      onPick={(value) => toggle('services', value)}
                    />
                  </Field>

                  <Field label={c.deliverables.label} hint={c.multiHint}>
                    <Select
                      options={c.deliverables.options}
                      selected={form.deliverables}
                      placeholder={c.choose}
                      multiple
                      expanded={expanded === 'deliverables'}
                      onToggleExpanded={() => expand('deliverables')}
                      onPick={(value) => toggle('deliverables', value)}
                    />
                  </Field>

                  <Field label={c.budget.label}>
                    <Select
                      options={c.budget.options}
                      selected={form.budget ? [form.budget] : []}
                      placeholder={c.choose}
                      multiple={false}
                      expanded={expanded === 'budget'}
                      onToggleExpanded={() => expand('budget')}
                      onPick={(value) => {
                        pick('budget', value);
                        setExpanded(null);
                      }}
                    />
                  </Field>

                  <Field label={c.timeline.label}>
                    <Select
                      options={c.timeline.options}
                      selected={form.timeline ? [form.timeline] : []}
                      placeholder={c.choose}
                      multiple={false}
                      expanded={expanded === 'timeline'}
                      onToggleExpanded={() => expand('timeline')}
                      onPick={(value) => {
                        pick('timeline', value);
                        setExpanded(null);
                      }}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.nameLabel}>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
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
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
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
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                      placeholder={c.companyPlaceholder}
                      className={inputClass}
                    />
                  </Field>

                  <Field label={c.messageLabel}>
                    <textarea
                      name="message"
                      required
                      rows={3}
                      value={form.message}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
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
                    <p className="text-[13px] font-light text-[#FF8A8A]">
                      {c.errorText}
                    </p>
                  )}
                </motion.div>

                {/* Footer: submit stays reachable, with the no-form routes beneath. */}
                <div className="shrink-0 border-t border-[#D7E2EA]/10 bg-[#0D0D0D] px-5 py-4">
                  <ShinyButton
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full px-8 py-3 text-xs"
                  >
                    {status === 'sending' ? c.sending : c.submit}
                  </ShinyButton>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="truncate border-b border-[#D7E2EA]/25 pb-px text-[11px] font-light text-[#D7E2EA]/75 transition-colors duration-150 hover:border-[#D7E2EA] hover:text-[#D7E2EA]"
                    >
                      {CONTACT_EMAIL}
                    </a>

                    {VISIBLE_SOCIAL_LINKS.length > 0 && (
                      <div className="flex shrink-0 gap-1.5">
                        {VISIBLE_SOCIAL_LINKS.map(({ name, href, Icon }) => (
                          <a
                            key={name}
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={name}
                            title={name}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D7E2EA]/20 text-[#D7E2EA]/80 transition-colors duration-150 hover:border-transparent hover:bg-[#D7E2EA] hover:text-[#0C0C0C]"
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
