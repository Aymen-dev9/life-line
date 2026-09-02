"use client";

import Link from "next/link";
import { ArrowUpLeft, CalendarClock, FlaskConical, HeartHandshake, MapPin, RotateCcw, Stethoscope, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";
import type { CareRequest } from "@/modules/requests/types";

type PatientView = { requests: CareRequest[] };

export default function PatientHome() {
  const { t } = useI18n();
  const [view, setView] = useState<PatientView | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/demo", { headers: { "x-demo-role": "PATIENT" }, cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { data: PatientView }) => setView(payload.data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const latest = view?.requests[0];

  return (
    <AppShell>
      <section className="welcome-row">
        <div><p className="eyebrow">{t("patientExperience")}</p><h1>{t("hello")}</h1><p>{t("familyContext")}</p></div>
        <div className="mini-avatars"><span>س</span><span>أ</span><span className="add-avatar">+2</span></div>
      </section>

      <section className="section-block service-section">
        <div className="section-heading"><div><p className="eyebrow">01</p><h2>{t("needService")}</h2><p>{t("needServiceHint")}</p></div></div>
        <Link href="/book/home-nursing" className="featured-service">
          <span className="service-icon"><HeartHandshake size={31} /></span>
          <span className="service-copy"><strong>{t("homeNursing")}</strong><small>{t("homeNursingDesc")}</small><em>{t("bookNow")} <ArrowUpLeft size={16} /></em></span>
          <span className="service-art" aria-hidden="true"><i /><i /><i /></span>
        </Link>
        <div className="service-mini-grid">
          <button><span><Stethoscope size={21} /></span><b>{t("doctorVisit")}</b></button>
          <button><span><FlaskConical size={21} /></span><b>{t("bloodCollection")}</b></button>
          <button><span><CalendarClock size={21} /></span><b>{t("elderlyCare")}</b></button>
        </div>
      </section>

      <section id="quick" className="section-block">
        <div className="section-heading"><h2>{t("quickActions")}</h2></div>
        <div className="quick-grid">
          <Link href="/book/home-nursing"><RotateCcw size={22} /><span>{t("repeatService")}</span></Link>
          <button><UsersRound size={22} /><span>{t("myFamily")}</span></button>
          <button><FlaskConical size={22} /><span>{t("myResults")}</span></button>
          <button><MapPin size={22} /><span>{t("savedAddresses")}</span></button>
        </div>
      </section>

      <section id="active" className="section-block active-care">
        <div className="section-heading"><h2>{t("activeCare")}</h2></div>
        {latest ? (
          <Link href={`/case/${latest.id}`} className="request-card">
            <div className="request-card-top"><span className="reference">{latest.reference}</span><StatusBadge status={latest.status} /></div>
            <h3>{t("homeNursing")}</h3>
            <p>{latest.address.district} · {latest.schedule.type === "ASAP" ? t("asap") : latest.schedule.window}</p>
            <span className="text-link">{t("trackRequest")} <ArrowUpLeft size={15} /></span>
          </Link>
        ) : (
          <div className="empty-state compact"><span><Stethoscope size={27} /></span><div><strong>{t("noActiveCare")}</strong><p>{t("noActiveCareHint")}</p></div></div>
        )}
      </section>
    </AppShell>
  );
}
