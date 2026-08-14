import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True when the browser can synthesise speech (false during SSR and on older browsers). */
export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Reads text aloud using the browser's built-in speech synthesis — no
 * dependency, no API key, and it inherits the OS voice pack, so Hindi alerts
 * are spoken in Hindi wherever that voice is installed. Accessibility
 * fallback for users who can't read a dashboard at a glance.
 */
export function speak(text: string, locale: "en" | "hi" = "en") {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === "hi" ? "hi-IN" : "en-US";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  return true;
}
