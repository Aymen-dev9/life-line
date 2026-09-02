import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.brand.nameEn,
    short_name: appConfig.brand.nameEn,
    description: "Home healthcare and medical case management",
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
