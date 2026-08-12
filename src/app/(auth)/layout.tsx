import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 p-10 text-white lg:flex">
        <Link href="/" className="text-lg font-bold tracking-tight">
          BreatheSafe
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Breathe smarter. Live safer.
          </h1>
          <p className="max-w-md text-blue-50/90">
            Real-time air quality, personalized health guidance, and smart alerts —
            your personal air quality guardian.
          </p>
        </div>
        <p className="text-sm text-blue-50/70">
          &copy; {new Date().getFullYear()} BreatheSafe
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
