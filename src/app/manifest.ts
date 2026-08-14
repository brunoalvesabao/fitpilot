import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FitPilot",
    short_name: "FitPilot",
    description: "Gestão para personal trainers autônomos",
    start_url: "/app/hoje",
    scope: "/",
    display: "standalone",
    background_color: "#0C0D10",
    theme_color: "#0C0D10",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
