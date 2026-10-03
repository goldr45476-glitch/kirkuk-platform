"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "@/features/feed/actions";

/** Marks everything as read once the list has been rendered. */
export function MarkRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) markNotificationsReadAction();
  }, [hasUnread]);
  return null;
}
