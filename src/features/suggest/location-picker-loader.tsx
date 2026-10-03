"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/card";

export const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> });
export type { LatLng } from "./location-picker";
