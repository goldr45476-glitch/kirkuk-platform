"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Header bell with a live unread badge (Supabase Realtime on `notifications`). */
export function NotificationBell({ userId, initial, label }: { userId: string; initial: number; label: string }) {
  const [count, setCount] = useState(initial);
  useEffect(() => setCount(initial), [initial]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`notif:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => setCount((c) => c + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return (
    <Link href="/notifications" aria-label={count ? `${label} (${count})` : label} className="relative inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted">
      <Bell className="size-5" aria-hidden />
      {count > 0 && <span className="absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
