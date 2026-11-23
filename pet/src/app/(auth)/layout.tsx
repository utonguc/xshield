import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Logo className="text-lg" />
      <main className="mt-8 w-full max-w-md">{children}</main>
    </div>
  );
}
