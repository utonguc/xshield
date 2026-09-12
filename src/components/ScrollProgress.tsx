import { motion, useScroll, useSpring } from "framer-motion";

/** Sayfanın en üstünde, ne kadar kaydırıldığını gösteren ince bir çizgi. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.2 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-accent origin-left z-[60]"
    />
  );
}
