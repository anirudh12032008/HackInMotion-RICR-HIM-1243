"use client";

import { useEffect, useRef } from "react";
import { gsap, ease, prefersReducedMotion } from "@/lib/gsap";

/**
 * Line-by-line clip reveal for a headline — each line rises out from behind a
 * mask rather than fading in place, the classic editorial "unveiling" motion.
 * Takes an array of lines instead of arbitrary children so each one can be
 * wrapped in its own overflow-hidden mask.
 */
export function TextReveal({
  lines,
  className,
  lineClassName,
  delay = 0,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const targets = el.querySelectorAll("[data-reveal-line]");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { yPercent: 110, rotate: 1 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.1,
          delay,
          ease: ease.out,
          stagger: 0.09,
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <span data-reveal-line className={cn("block", lineClassName)}>
            {line}
          </span>
        </span>
      ))}
    </div>
  );
}

function cn(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
