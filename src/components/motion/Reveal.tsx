"use client";

import { useEffect, useRef } from "react";
import { gsap, ease, prefersReducedMotion } from "@/lib/gsap";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger children of this element instead of animating the whole block at once. */
  stagger?: boolean;
  delay?: number;
};

export function Reveal({ children, className, stagger, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const targets = stagger ? Array.from(el.children) : el;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const alreadyVisible =
      !viewportHeight || el.getBoundingClientRect().top < viewportHeight * 0.85;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: ease.out,
          stagger: stagger ? 0.08 : 0,
          ...(alreadyVisible
            ? {}
            : {
                scrollTrigger: {
                  trigger: el,
                  start: "top 85%",
                  once: true,
                },
              }),
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [stagger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
