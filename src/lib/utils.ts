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
 * Chrome (and some other engines) return an empty voice list on the very
 * first call  the list loads asynchronously and fires `voiceschanged` once
 * ready. Calling speak() before that resolves is what makes the very first
 * utterance of a session come out in a flat, robotic default voice instead
 * of a real installed one. Cached so later calls resolve instantly.
 */
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!voicesPromise) {
    voicesPromise = new Promise((resolve) => {
      const existing = window.speechSynthesis.getVoices();
      if (existing.length > 0) {
        resolve(existing);
        return;
      }
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        () => resolve(window.speechSynthesis.getVoices()),
        { once: true }
      );
      // Some engines never fire voiceschanged if there's truly nothing to
      // load  don't hang the caller forever waiting for it.
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    });
  }
  return voicesPromise;
}

/** Picks the best available voice for a language  a real named voice beats the engine's silent fallback. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.split("-")[0];
  const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (matches.length === 0) return undefined;
  // Higher-quality network/cloud voices (Google, Microsoft Natural, Siri)
  // sound far less robotic than the local offline fallback most OSes ship.
  return (
    matches.find((v) => !v.localService) ??
    matches.find((v) => /google|natural|premium|enhanced/i.test(v.name)) ??
    matches[0]
  );
}

/**
 * Reads text aloud using the browser's built-in speech synthesis  no
 * dependency, no API key, and it inherits the OS voice pack, so Hindi alerts
 * are spoken in Hindi wherever that voice is installed. Accessibility
 * fallback for users who can't read a dashboard at a glance.
 */
export async function speak(text: string, locale: "en" | "hi" = "en") {
  if (!canSpeak()) return false;

  window.speechSynthesis.cancel();
  const lang = locale === "hi" ? "hi-IN" : "en-US";
  const voices = await loadVoices();
  const voice = pickVoice(voices, lang);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  // cancel() needs a beat to actually flush before speak() is queued —
  // calling them back-to-back is a well-known Chrome race that clips or
  // silently drops the utterance.
  setTimeout(() => window.speechSynthesis.speak(utterance), 50);
  return utterance;
}

/** Stops whatever speak() is currently reading. */
export function stopSpeak() {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}
