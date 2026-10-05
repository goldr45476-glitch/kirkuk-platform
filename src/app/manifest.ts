import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "كركوك الآن",
    short_name: "كركوك الآن",
    description: "كل ما تحتاجه في كركوك، في مكان واحد",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: "#f8f6f1",
    theme_color: "#0f766e",
    categories: ["lifestyle", "navigation", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "وين نروح؟", url: "/where", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "مفتوح الآن", url: "/search?open=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "العروض", url: "/offers", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
