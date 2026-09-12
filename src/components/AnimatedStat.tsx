import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/**
 * `countTo` verilmişse ekrana girdiğinde 0'dan hedef değere sayarak
 * belirir; verilmemişse (ör. "7/24") sabit metni olduğu gibi gösterir.
 */
export default function AnimatedStat({
  value,
  countTo,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: string;
  countTo?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView && countTo !== undefined) {
      motionVal.set(countTo);
    }
  }, [isInView, countTo, motionVal]);

  useEffect(() => {
    if (countTo === undefined) return;
    return spring.on("change", (v) => setDisplay(v.toFixed(decimals)));
  }, [spring, countTo, decimals]);

  if (countTo === undefined) {
    return (
      <div ref={ref} className="font-extrabold text-xl sm:text-2xl text-[var(--ink)] leading-tight">
        {value}
      </div>
    );
  }

  return (
    <div ref={ref} className="font-extrabold text-xl sm:text-2xl text-[var(--ink)] leading-tight tabular-nums">
      {prefix}
      {display}
      {suffix}
    </div>
  );
}
