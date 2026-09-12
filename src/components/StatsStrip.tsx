import { motion } from "framer-motion";
import { stats } from "../data/content";
import AnimatedStat from "./AnimatedStat";

export default function StatsStrip() {
  return (
    <section className="border-y border-[var(--border)]">
      <div className="container py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <AnimatedStat value={s.value} countTo={s.countTo} decimals={s.decimals} suffix={s.suffix} />
              <div className="text-[var(--subtle)] text-xs sm:text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
