import type { Metadata, Viewport } from "next";
import { Tajawal, Plus_Jakarta_Sans } from "next/font/google";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { ContentProvider } from "@/care/content-provider";
import { getContent } from "@/care/server/content-data";
import "./globals.css";
import "@/care/care.css";
import "leaflet/dist/leaflet.css";

export const dynamic = "force-dynamic";

const arabic = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"], variable: "--font-arabic", display: "swap" });
const latin = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Life Line", template: "%s | Life Line" },
  description: "منصة الرعاية الطبية المنزلية والصيدلية — Life Line",
  applicationName: "Life Line",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b7a69" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = await getContent();
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={`${arabic.variable} ${latin.variable}`}>
      <body>
        <ContentProvider initial={content}>{children}<PwaRegistrar /></ContentProvider>
      </body>
    </html>
  );
}
