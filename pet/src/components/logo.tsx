import Link from "next/link";

export function PawIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <ellipse cx="6.2" cy="9.3" rx="2.1" ry="2.6" />
      <ellipse cx="10" cy="5.6" rx="2.1" ry="2.7" />
      <ellipse cx="14.4" cy="5.6" rx="2.1" ry="2.7" />
      <ellipse cx="18" cy="9.5" rx="2.1" ry="2.6" />
      <path d="M12.1 10.6c-2.6 0-6.1 3.7-6.1 6.4 0 1.9 1.4 2.9 3.1 2.9 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3.1-1 3.1-2.9 0-2.7-3.5-6.4-6.1-6.4Z" />
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="grid size-8 place-items-center rounded-xl bg-brand-600 text-white">
        <PawIcon className="size-5" />
      </span>
      <span>
        xShield <span className="text-brand-600">Pet</span>
      </span>
    </Link>
  );
}
