"use client";

import { motion } from "framer-motion";

const userTypes = [
  "Researchers",
  "Students",
  "Writers",
  "Developers",
  "Data Analysts",
  "Designers",
  "Engineers",
  "Founders",
  "Product Managers",
  "Marketers",
];

export function UserTypesMarquee() {
  return (
    <div className="flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
      <motion.div
        animate={{
          x: [0, -50 + "%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex shrink-0 gap-4 py-2"
      >
        {[...userTypes, ...userTypes].map((type, i) => (
          <div
            key={i}
            className="flex items-center rounded-full border border-border-soft bg-surface-2 px-4 py-1.5 text-xs font-medium text-text-muted"
          >
            {type}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
