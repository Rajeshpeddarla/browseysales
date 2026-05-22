"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface MarqueeProps {
  items: string[];
  className?: string;
  speed?: number;
  reverse?: boolean;
}

export function Marquee({ items, className, speed = 20, reverse = false }: MarqueeProps) {
  return (
    <div className={cn("flex overflow-hidden select-none gap-6", className)}>
      <motion.div
        animate={{
          x: reverse ? [0, -100 + "%"] : [-100 + "%", 0],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex min-w-full shrink-0 items-center justify-around gap-6"
      >
        {items.map((item, i) => (
          <span key={i} className="whitespace-nowrap font-medium text-text-muted hover:text-text transition-colors">
            {item}
          </span>
        ))}
      </motion.div>
      <motion.div
        aria-hidden="true"
        animate={{
          x: reverse ? [0, -100 + "%"] : [-100 + "%", 0],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex min-w-full shrink-0 items-center justify-around gap-6"
      >
        {items.map((item, i) => (
          <span key={i} className="whitespace-nowrap font-medium text-text-muted hover:text-text transition-colors">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
