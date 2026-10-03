import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center text-center">
      <div>
        <p className="text-6xl font-extrabold text-primary">404</p>
        <Link href="/" className="mt-4 inline-block font-semibold underline">←</Link>
      </div>
    </main>
  );
}
