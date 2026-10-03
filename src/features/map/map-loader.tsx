"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/card";

// Leaflet touches `window`, so it must be client-only.
export const MapLoader = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <Skeleton className="h-[60dvh] min-h-80 w-full rounded-xl" />,
});
