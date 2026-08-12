import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg italic">
          BreatheSafe
        </Link>
        <Reveal className="space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-balance">
            Breathe smarter.
            <br />
            Live safer.
          </h1>
          <p className="max-w-md text-sm text-primary-foreground/75">
            Real-time air quality, personalized health guidance, and smart alerts —
            your personal air quality guardian.
          </p>
        </Reveal>
        <p className="text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} BreatheSafe
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Reveal className="w-full max-w-sm">{children}</Reveal>
      </div>
    </div>
  );
}
