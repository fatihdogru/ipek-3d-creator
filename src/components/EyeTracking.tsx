import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

export type EyeVariant = 'realistic' | 'cartoon' | 'minimal' | 'cyber';

interface EyeTrackingProps {
  className?: string;
  /** Width of each eye in pixels. Height follows from the variant's aspect. */
  eyeSize?: number;
  /** Gap between eyes in pixels. */
  gap?: number;
  irisColor?: string;
  /** Lighter tone used for the iris highlight gradient. */
  irisColorSecondary?: string;
  pupilColor?: string;
  /** Colour of the white of the eye. */
  scleraColor?: string;
  /** How far the iris may travel from centre, 0–1. */
  pupilRange?: number;
  showReflection?: boolean;
  showIrisDetail?: boolean;
  /** Drift the gaze around when the cursor has been still for a while. */
  idleAnimation?: boolean;
  /** Milliseconds between blinks. 0 disables blinking. */
  blinkInterval?: number;
  eyeCount?: number;
  variant?: EyeVariant;
  /** Dilate the pupil as the cursor approaches. */
  reactivePupil?: boolean;
  showEyelids?: boolean;
}

interface EyeProps extends Required<Omit<EyeTrackingProps, 'className' | 'gap' | 'eyeCount' | 'idleAnimation'>> {
  gazeX: MutableRefObject<number>;
  gazeY: MutableRefObject<number>;
}

function Eye({
  eyeSize,
  irisColor,
  irisColorSecondary,
  pupilColor,
  scleraColor,
  pupilRange,
  showReflection,
  showIrisDetail,
  blinkInterval,
  variant,
  reactivePupil,
  showEyelids,
  gazeX,
  gazeY,
}: EyeProps) {
  const eyeRef = useRef<HTMLDivElement>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 25, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 25, mass: 0.5 });

  // A motion value, not state: this updates every animation frame, and state
  // would re-render the whole eye — including the randomised vessel pattern —
  // 60 times a second.
  const pupilScale = useMotionValue(1);
  const springPupilScale = useSpring(pupilScale, { stiffness: 150, damping: 20 });

  const irisSize = eyeSize * 0.45;
  const pupilSize = irisSize * 0.5;
  const maxOffset = (eyeSize / 2 - irisSize / 2) * pupilRange;

  useEffect(() => {
    if (blinkInterval <= 0) return;

    // Re-armed after each blink rather than run on a fixed interval, so the
    // two eyes drift apart naturally instead of blinking in lockstep.
    let blinkTimer: ReturnType<typeof setTimeout>;
    let resetTimer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      blinkTimer = setTimeout(
        () => {
          setIsBlinking(true);
          resetTimer = setTimeout(() => {
            setIsBlinking(false);
            schedule();
          }, 150);
        },
        blinkInterval + Math.random() * 1500,
      );
    };

    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(resetTimer);
    };
  }, [blinkInterval]);

  useEffect(() => {
    let frame: number;

    const update = () => {
      frame = requestAnimationFrame(update);

      const el = eyeRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const dx = gazeX.current - (rect.left + rect.width / 2);
      const dy = gazeY.current - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Ease into the full offset over ~3 eye-widths, so a cursor right next to
      // the eye does not slam the iris against the edge.
      const reach = maxOffset * 3;
      const offset = (Math.min(distance, reach) / reach) * maxOffset;

      x.set(Math.cos(angle) * offset);
      y.set(Math.sin(angle) * offset);

      if (reactivePupil) {
        pupilScale.set(
          distance < 200
            ? 1.3 - (distance / 200) * 0.3
            : 0.85 + (Math.min(distance, 800) / 800) * 0.15,
        );
      }
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [x, y, pupilScale, maxOffset, reactivePupil, gazeX, gazeY]);

  const irisRotation = useTransform(springX, [-maxOffset, maxOffset], [-15, 15]);

  // Randomised once per mount: regenerating these on render made them flicker.
  const vessels = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        left: `${20 + i * 12}%`,
        top: `${10 + (i % 3) * 15}%`,
        rotate: -30 + i * 20,
        opacity: 0.3 + Math.random() * 0.4,
      })),
    [],
  );

  const eyeWidth = eyeSize;
  const eyeHeight = eyeSize * (variant === 'cartoon' ? 1 : 0.85);

  const scleraBackground =
    variant === 'realistic'
      ? `radial-gradient(circle at 35% 35%, ${scleraColor} 0%, ${scleraColor}ee 60%, ${scleraColor}cc 100%)`
      : variant === 'cyber'
        ? 'radial-gradient(circle at 50% 50%, #0a0a1a 0%, #111128 100%)'
        : scleraColor;

  const scleraShadow =
    variant === 'realistic'
      ? 'inset 0 2px 8px rgba(0,0,0,0.15), inset 0 -1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.1)'
      : variant === 'cyber'
        ? 'inset 0 0 30px rgba(0,200,255,0.1), 0 0 20px rgba(0,200,255,0.15)'
        : variant === 'cartoon'
          ? 'inset 0 4px 12px rgba(0,0,0,0.1), 0 6px 24px rgba(0,0,0,0.15)'
          : '0 2px 10px rgba(0,0,0,0.1)';

  return (
    <motion.div
      ref={eyeRef}
      className={`relative overflow-hidden rounded-full ${
        variant === 'cyber' ? 'border border-cyan-500/30' : ''
      }`}
      style={{
        width: eyeWidth,
        height: eyeHeight,
        background: scleraBackground,
        boxShadow: scleraShadow,
      }}
      animate={{ scaleY: isBlinking ? 0.05 : 1 }}
      transition={{ scaleY: { duration: 0.1, ease: 'easeInOut' } }}
    >
      {variant === 'realistic' && (
        <div className="absolute inset-0 overflow-hidden rounded-full opacity-[0.07]">
          {vessels.map((vessel, i) => (
            <div
              key={i}
              className="absolute bg-red-500"
              style={{
                width: '1px',
                height: eyeSize * 0.4,
                left: vessel.left,
                top: vessel.top,
                transform: `rotate(${vessel.rotate}deg)`,
                opacity: vessel.opacity,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: irisSize,
          height: irisSize,
          left: eyeWidth / 2 - irisSize / 2,
          top: eyeHeight / 2 - irisSize / 2,
          x: springX,
          y: springY,
          background:
            variant === 'cyber'
              ? `conic-gradient(from 0deg, ${irisColor}, ${irisColorSecondary}, ${irisColor})`
              : `radial-gradient(circle at 40% 40%, ${irisColorSecondary}, ${irisColor} 60%, ${irisColor}dd 100%)`,
          boxShadow:
            variant === 'realistic'
              ? 'inset 0 2px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1)'
              : variant === 'cyber'
                ? `0 0 15px ${irisColor}66, inset 0 0 10px ${irisColor}33`
                : 'inset 0 1px 4px rgba(0,0,0,0.2)',
        }}
      >
        {showIrisDetail && (
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{ rotate: irisRotation }}
          >
            {variant === 'cyber' ? (
              <>
                <div
                  className="absolute inset-[15%] rounded-full border border-dashed opacity-40"
                  style={{ borderColor: irisColor }}
                />
                <div
                  className="absolute inset-[30%] rounded-full border opacity-30"
                  style={{ borderColor: irisColorSecondary }}
                />
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 origin-left opacity-25"
                    style={{
                      width: irisSize * 0.45,
                      height: '1px',
                      background: irisColor,
                      transform: `rotate(${i * 45}deg)`,
                    }}
                  />
                ))}
              </>
            ) : (
              <>
                {Array.from({ length: 24 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 origin-left"
                    style={{
                      width: irisSize * 0.45,
                      height: '1px',
                      background: `linear-gradient(to right, transparent 20%, ${irisColor}44 50%, transparent 80%)`,
                      transform: `rotate(${i * 15}deg)`,
                      opacity: 0.3 + (i % 3) * 0.15,
                    }}
                  />
                ))}
                <div
                  className="absolute inset-[20%] rounded-full"
                  style={{ border: `1px solid ${irisColor}33` }}
                />
              </>
            )}
          </motion.div>
        )}

        <motion.div
          className="absolute rounded-full"
          style={{
            width: pupilSize,
            height: pupilSize,
            left: irisSize / 2 - pupilSize / 2,
            top: irisSize / 2 - pupilSize / 2,
            scale: reactivePupil ? springPupilScale : 1,
            background:
              variant === 'cyber'
                ? `radial-gradient(circle, ${pupilColor} 40%, transparent 100%)`
                : pupilColor,
            boxShadow: variant === 'cyber' ? `0 0 10px ${irisColor}88` : undefined,
          }}
        />

        {showReflection && (
          <>
            <div
              className="absolute rounded-full"
              style={{
                width: pupilSize * 0.35,
                height: pupilSize * 0.35,
                left: irisSize * 0.3,
                top: irisSize * 0.25,
                background:
                  variant === 'cyber'
                    ? 'radial-gradient(circle, rgba(0,255,255,0.9), transparent)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.6))',
                filter: 'blur(0.5px)',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: pupilSize * 0.15,
                height: pupilSize * 0.15,
                left: irisSize * 0.58,
                top: irisSize * 0.6,
                background:
                  variant === 'cyber' ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.7)',
              }}
            />
          </>
        )}
      </motion.div>

      {showEyelids && variant !== 'minimal' && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{
              height: eyeHeight * 0.35,
              background:
                variant === 'cyber'
                  ? 'linear-gradient(to bottom, rgba(0,10,30,0.6) 0%, transparent 100%)'
                  : 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 100%)',
              borderRadius: '50% 50% 0 0',
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{
              height: eyeHeight * 0.2,
              background:
                variant === 'cyber'
                  ? 'linear-gradient(to top, rgba(0,10,30,0.4) 0%, transparent 100%)'
                  : 'linear-gradient(to top, rgba(0,0,0,0.04) 0%, transparent 100%)',
              borderRadius: '0 0 50% 50%',
            }}
          />
        </>
      )}

      {variant === 'cyber' && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 h-[2px]"
          style={{
            background: `linear-gradient(to right, transparent, ${irisColor}44, transparent)`,
          }}
          animate={{ top: [0, eyeHeight, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

export default function EyeTracking({
  className = '',
  eyeSize = 120,
  gap = 40,
  irisColor = '#4A6741',
  irisColorSecondary = '#6B8F62',
  pupilColor = '#0a0a0a',
  scleraColor = '#F5F0EB',
  pupilRange = 0.7,
  showReflection = true,
  showIrisDetail = true,
  idleAnimation = true,
  blinkInterval = 4000,
  eyeCount = 2,
  variant = 'realistic',
  reactivePupil = true,
  showEyelids = true,
}: EyeTrackingProps) {
  // Where the eyes are looking. Refs, not state: the pointer updates these on
  // every move and nothing here should re-render on that.
  const gazeX = useRef(0);
  const gazeY = useRef(0);
  const lastMoveAt = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    gazeX.current = window.innerWidth / 2;
    gazeY.current = window.innerHeight / 2;
    setMounted(true);
  }, []);

  useEffect(() => {
    const track = (clientX: number, clientY: number) => {
      gazeX.current = clientX;
      gazeY.current = clientY;
      lastMoveAt.current = Date.now();
    };

    const onMouseMove = (e: MouseEvent) => track(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) track(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!idleAnimation) return;

    // Wander around the viewport centre once the pointer has been still for a
    // few seconds, so the eyes never freeze mid-stare.
    const interval = setInterval(() => {
      if (Date.now() - lastMoveAt.current < 3000) return;
      gazeX.current = window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.5;
      gazeY.current = window.innerHeight / 2 + (Math.random() - 0.5) * window.innerHeight * 0.5;
    }, 2500);

    return () => clearInterval(interval);
  }, [idleAnimation]);

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ gap }}>
        {Array.from({ length: eyeCount }, (_, i) => (
          <div
            key={i}
            className="rounded-full bg-neutral-800"
            style={{ width: eyeSize, height: eyeSize * 0.85 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ gap }}>
      {Array.from({ length: eyeCount }, (_, i) => (
        <Eye
          key={i}
          eyeSize={eyeSize}
          irisColor={irisColor}
          irisColorSecondary={irisColorSecondary}
          pupilColor={pupilColor}
          scleraColor={scleraColor}
          pupilRange={pupilRange}
          showReflection={showReflection}
          showIrisDetail={showIrisDetail}
          blinkInterval={blinkInterval}
          variant={variant}
          reactivePupil={reactivePupil}
          showEyelids={showEyelids}
          gazeX={gazeX}
          gazeY={gazeY}
        />
      ))}
    </div>
  );
}

export { EyeTracking };
