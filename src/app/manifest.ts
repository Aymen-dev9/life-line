import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Line",
    short_name: "Life Line",
    description: "منصة الرعاية الطبية المنزلية والصيدلية",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#0b7a69",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
