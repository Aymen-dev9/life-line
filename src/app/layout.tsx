import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import { appConfig } from "@/config/app";
import { I18nProvider } from "@/i18n/provider";
import { PwaRegistrar } from "@/components/pwa-registrar";
import "./globals.css";

const arabic = Noto_Kufi_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap" });
const latin = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });

export const metadata: Metadata = {
  title: { default: appConfig.brand.nameEn, template: `%s | ${appConfig.brand.nameEn}` },
  description: "Arabic-first home healthcare and medical case platform",
  applicationName: appConfig.brand.nameEn,
  robots: { index: false, follow: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b7a69" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={`${arabic.variable} ${latin.variable}`}><body><I18nProvider>{children}<PwaRegistrar /></I18nProvider></body></html>;
}
