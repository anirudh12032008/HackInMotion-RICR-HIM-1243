"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import en from "../../messages/en.json";
import hi from "../../messages/hi.json";

export type Locale = "en" | "hi";

const MESSAGES: Record<Locale, typeof en> = { en, hi };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(dict: Record<string, unknown>, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("locale") : null;
    if (stored === "en" || stored === "hi") setLocaleState(stored);
  }, []);

  useEffect(() => {
    const userLocale = session?.user?.language;
    if (userLocale === "en" || userLocale === "hi") setLocaleState(userLocale);
  }, [session?.user?.language]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem("locale", next);
  }

  function t(key: string): string {
    return resolve(MESSAGES[locale], key) ?? resolve(MESSAGES.en, key) ?? key;
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
