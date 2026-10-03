import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

/** Renders a lucide icon by its name (as stored in categories.icon). */
export function DynamicIcon({ icon, ...props }: { icon: string | null } & LucideProps) {
  const Cmp = (icon && (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[icon]) || Lucide.Grid2x2;
  return <Cmp {...props} />;
}
