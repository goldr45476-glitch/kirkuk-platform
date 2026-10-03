import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({ src, name, size = 40, className, square }: { src?: string | null; name: string; size?: number; className?: string; square?: boolean }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden bg-primary/15 font-bold text-primary", square ? "rounded-xl" : "rounded-full", className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {src ? <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" /> : (name.trim().charAt(0) || "؟")}
    </span>
  );
}
