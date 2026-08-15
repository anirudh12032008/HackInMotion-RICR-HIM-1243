export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="9" cy="23" r="3.4" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <path d="M9 15a8 8 0 0 1 8 8" opacity="0.85" />
        <path d="M9 9a14 14 0 0 1 14 14" opacity="0.55" />
        <path d="M9 3a20 20 0 0 1 20 20" opacity="0.28" />
      </g>
    </svg>
  );
}
