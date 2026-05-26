import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type ElementType,
} from 'react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';

// ─── SplitText ──────────────────────────────────────────────────────────────

interface SplitTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
}

export function SplitText({ text, as: Tag = 'span', className = '', delay = 0 }: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const chars = text.split('');

  useEffect(() => {
    if (!ref.current) return;
    const spans = ref.current.querySelectorAll('.split-char');

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(spans, {
        y: 80,
        opacity: 0,
        rotateX: -60,
        stagger: 0.018,
        duration: 0.8,
        ease: 'power4.out',
        delay,
      });
    });
    return () => mm.revert();
  }, [delay]);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={{ display: 'inline', perspective: '600px' }}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          className="split-char"
          style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char === ' ' ? '\u00a0' : char}
        </span>
      ))}
    </Tag>
  );
}

// ─── MagneticButton ─────────────────────────────────────────────────────────

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'button' | 'a';
  href?: string;
}

export function MagneticButton({ children, className = '', onClick, as: Tag = 'button', href }: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current || !innerRef.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(ref.current, { x: x * 0.3, y: y * 0.3, duration: 0.4 });
    gsap.to(innerRef.current, { x: x * 0.5, y: y * 0.5, duration: 0.4 });
  };

  const handleLeave = () => {
    if (!ref.current || !innerRef.current) return;
    gsap.to([ref.current, innerRef.current], { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  const props = {
    ref: ref as React.RefObject<HTMLButtonElement>,
    className,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    onClick,
    ...(href ? { href } : {}),
  };

  return (
    <Tag {...(props as object)}>
      <span ref={innerRef} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        {children}
      </span>
    </Tag>
  );
}

// ─── TiltCard ───────────────────────────────────────────────────────────────

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

export function TiltCard({ children, className = '' }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(ref.current, {
      rotateY: x * 10,
      rotateX: -y * 10,
      duration: 0.3,
      transformPerspective: 800,
      ease: 'power2.out',
    });
  };

  const handleLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

// ─── CountUp ────────────────────────────────────────────────────────────────

interface CountUpProps {
  target: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function CountUp({ target, suffix = '', prefix = '', className = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const obj = { value: 0 };
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(obj, {
        value: target,
        duration: 2,
        ease: 'power2.out',
        snap: { value: 1 },
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = `${prefix}${Math.round(obj.value).toLocaleString('en-IN')}${suffix}`;
          }
        },
      });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (ref.current) ref.current.textContent = `${prefix}${target.toLocaleString('en-IN')}${suffix}`;
    });
    return () => mm.revert();
  }, [inView, target, suffix, prefix]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

// ─── Reveal ─────────────────────────────────────────────────────────────────

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

export function Reveal({ children, className = '', delay = 0, y = 30 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── ScrambleText ────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

interface ScrambleTextProps {
  text: string;
  className?: string;
}

export function ScrambleText({ text, className = '' }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const total = 20;
    const interval = setInterval(() => {
      frame++;
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (frame / total > i / text.length) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );
      if (frame >= total) {
        clearInterval(interval);
        setDisplay(text);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [inView, text]);

  return <span ref={ref} className={className}>{display}</span>;
}
