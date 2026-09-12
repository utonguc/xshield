import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

type Step = { icon: string; title: string; desc: string };

/**
 * Dikey, kaydırdıkça kendini çizen bir zaman çizelgesi. `pathLength`
 * SVG özniteliği sayesinde gerçek piksel yüksekliğini ölçmeye gerek
 * kalmadan çizgi 0 -> 100 arasında normalize ediliyor.
 */
export default function Roadmap({ steps, dotClassName = "bg-accent" }: { steps: Step[]; dotClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 55%"] });
  const dashOffset = useTransform(scrollYProgress, [0, 1], [100, 0]);

  return (
    <div ref={ref} className="relative pl-16 sm:pl-20">
      <svg
        className="absolute left-[23px] sm:left-[27px] top-2 w-[2px]"
        style={{ height: "calc(100% - 16px)" }}
        viewBox="0 0 2 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M1,0 L1,100" stroke="var(--border)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <motion.path
          d="M1,0 L1,100"
          stroke="var(--color-accentdeep)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          style={{ strokeDasharray: 100, strokeDashoffset: dashOffset }}
        />
      </svg>

      <div className="flex flex-col gap-12 sm:gap-14">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            <div
              className={`absolute -left-16 sm:-left-20 top-0 w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full ${dotClassName} border-4 border-[var(--bg)] flex items-center justify-center text-lg sm:text-xl leading-none`}
            >
              {s.icon}
            </div>
            <div className="mono text-xs text-[var(--subtle)] mb-1.5">{String(i + 1).padStart(2, "0")}</div>
            <h4 className="font-bold text-lg sm:text-xl text-[var(--ink)] mb-2 leading-snug">{s.title}</h4>
            <p className="text-[var(--muted)] text-[15px] leading-relaxed max-w-xl">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
