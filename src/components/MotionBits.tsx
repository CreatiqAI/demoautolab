/**
 * MotionBits — small interactive animation primitives for marketing pages.
 * Patterns adapted from reactbits.dev (Split Text, Count Up, Tilted Card,
 * Magnet, Scroll Reveal), implemented natively with framer-motion.
 */
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  motion,
  animate,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  MotionValue
} from 'framer-motion';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** Split Text: words rise out of a mask with stagger when scrolled into view. */
export const SplitHeading = ({
  text,
  className = '',
  delay = 0,
  stagger = 0.055
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) => {
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text} role="text">
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: '110%', opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.75, delay: delay + i * stagger, ease: EASE_OUT }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

/** Count Up: number animates from 0 when it enters the viewport. */
export const CountUp = ({
  to,
  suffix = '',
  duration = 1.8,
  className = ''
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [value, setValue] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setValue(Math.round(v))
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
};

/** Tilted Card: element tilts in 3D toward the cursor, spring-smoothed. */
export const TiltCard = ({
  children,
  className = '',
  max = 8
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) => {
  const reduce = useReducedMotion();
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useSpring(rotX, { stiffness: 160, damping: 20 });
  const springY = useSpring(rotY, { stiffness: 160, damping: 20 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotY.set(px * max * 2);
    rotX.set(-py * max * 2);
  };

  const handleLeave = () => {
    rotX.set(0);
    rotY.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/** Magnet: wrapper eases toward the cursor while hovered. */
export const Magnetic = ({
  children,
  strength = 0.35,
  className = ''
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) => {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 16 });
  const springY = useSpring(y, { stiffness: 180, damping: 16 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: springX, y: springY }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
};

/** One word of RevealWords — opacity keyed to scroll progress. */
const RevealWord = ({
  progress,
  range,
  children
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}) => {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {children}&nbsp;
    </motion.span>
  );
};

/** Scroll Reveal: paragraph brightens word-by-word as it scrolls through view. */
export const RevealWords = ({
  text,
  className = ''
}: {
  text: string;
  className?: string;
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.92', 'start 0.35']
  });
  const words = text.split(' ');

  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <RevealWord
          key={i}
          progress={scrollYProgress}
          range={[i / words.length, Math.min(1, (i + 2) / words.length)]}
        >
          {word}
        </RevealWord>
      ))}
    </p>
  );
};
