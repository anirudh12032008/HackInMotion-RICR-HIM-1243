import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const monoDisplay = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-display",
  weight: ["400", "500", "700"],
});
// Editorial serif reserved for the marketing/landing surface  the product's
// instrument screens (dashboard, readings) stay on the mono display face.
const editorial = Newsreader({
  subsets: ["latin"],
  variable: "--font-editorial-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "BreatheSafe  Breathe smarter. Live safer.",
  description:
    "Your personal air quality guardian  real-time AQI, personalized health guidance, forecasts, and community reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${monoDisplay.variable} ${editorial.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            <I18nProvider>
              {children}
              <Toaster richColors position="top-right" />
            </I18nProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
