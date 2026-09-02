"use client";

import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, HeartPulse, Home, Languages, Pill, Stethoscope, UserRound } from "lucide-react";
import { appConfig } from "@/config/app";
import { useI18n } from "@/i18n/provider";

export function AppShell({ children, surface = "patient", title }: { children: React.ReactNode; surface?: "patient" | "operations" | "provider"; title?: string }) {
  const { locale, setLocale, t } = useI18n();
  const brandName = locale === "ar" ? appConfig.brand.nameAr : appConfig.brand.nameEn;
  return (
    <div className={`app-frame surface-${surface}`}>
      <header className="topbar">
        <Link href="/" className="brand" aria-label={brandName}>
          <span className="brand-mark"><HeartPulse size={22} /></span>
          <span><strong>{brandName}</strong><small>{title ?? t("brandTagline")}</small></span>
        </Link>
        <div className="top-actions">
          <span className="simulation-pill"><span />{t("simulated")}</span>
          <button className="icon-button" aria-label={t("switchLanguage")} onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
            <Languages size={19} /><span>{t("switchLanguage")}</span>
          </button>
          {surface === "patient" && <button className="round-button" aria-label="Notifications"><Bell size={20} /></button>}
        </div>
      </header>
      <main className="page-content">{children}</main>
      {surface === "patient" && <PatientNav />}
      {surface !== "patient" && <PersonaNav surface={surface} />}
    </div>
  );
}

function PatientNav() {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link href="/" className="active"><Home size={21} /><span>{t("home")}</span></Link>
      <Link href="/#active"><Stethoscope size={21} /><span>{t("cases")}</span></Link>
      <Link href="/#active"><CalendarDays size={21} /><span>{t("appointments")}</span></Link>
      <Link href="/#quick"><Pill size={21} /><span>{t("medications")}</span></Link>
      <Link href="/#profile"><UserRound size={21} /><span>{t("profile")}</span></Link>
    </nav>
  );
}

function PersonaNav({ surface }: { surface: "operations" | "provider" }) {
  const { t } = useI18n();
  return (
    <div className="persona-nav">
      <Link href="/">{t("patientExperience")}</Link>
      <Link href="/operations" className={surface === "operations" ? "active" : ""}>{t("operations")}</Link>
      <Link href="/provider" className={surface === "provider" ? "active" : ""}>{t("provider")}</Link>
      <ChevronDown size={16} />
    </div>
  );
}

