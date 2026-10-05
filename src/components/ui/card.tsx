import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_hsl(var(--foreground)/.04),0_10px_28px_-14px_hsl(var(--primary)/.22)]", className)} {...props} />
);

export const Badge = ({
  className, tone = "muted", ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "muted" | "primary" | "accent" | "success" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
      tone === "muted" && "bg-muted text-muted-foreground",
      tone === "primary" && "bg-primary/12 text-primary",
      tone === "accent" && "bg-accent/20 text-accent-foreground dark:text-accent",
      tone === "success" && "bg-success/15 text-success",
      className,
    )}
    {...props}
  />
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} aria-hidden />;
