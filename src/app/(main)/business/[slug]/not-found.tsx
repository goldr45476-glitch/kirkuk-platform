import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <Link href="/search" className="mt-4 inline-block font-semibold underline">←</Link>
    </div>
  );
}
