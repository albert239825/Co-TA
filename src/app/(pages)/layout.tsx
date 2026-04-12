import Link from "next/link";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tracking-tight"
          >
            Co-TA
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
