"use client";

import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Clock3, HeartPulse, MapPin, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";
import type { CareRequest, Patient } from "@/modules/requests/types";

type PatientView = { requests: CareRequest[]; patients: Patient[] };

export function CaseView({ requestId }: { requestId: string }) {
  const { locale, t } = useI18n();
  const [view, setView] = useState<PatientView | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/demo", { headers: { "x-demo-role": "PATIENT", "x-demo-actor": "account-caregiver" }, cache: "no-store" });
    const payload = await response.json() as { data: PatientView };
    setView(payload.data);
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 5000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);
  const request = view?.requests.find((item) => item.id === requestId);
  const patient = view?.patients.find((item) => item.id === request?.patientId);

  async function sendRating() {
    if (!request) return;
    const response = await fetch("/api/v1/demo", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "PATIENT", "x-demo-actor": "account-caregiver" }, body: JSON.stringify({ action: "rateRequest", requestId: request.id, overall: rating, comment: comment || undefined }) });
    if (response.ok) await load();
  }

  if (!view) return <AppShell><div className="center-state">{t("loading")}</div></AppShell>;
  if (!request) return <AppShell><div className="center-state"><h1>{t("notFound")}</h1><Link href="/" className="primary-button">{t("home")}</Link></div></AppShell>;
  const completed = Boolean(request.visit?.completedAt);

  return <AppShell><div className="case-page"><Link href="/" className="back-link">{locale === "ar" ? <ArrowRight /> : <ArrowLeft />}{t("home")}</Link><header className="case-hero"><div><p className="eyebrow">{request.caseReference}</p><h1>{t("caseTitle")}</h1><p>{patient?.name[locale]} · {t("homeNursing")}</p></div><StatusBadge status={request.status} /></header><div className="case-grid"><section className="timeline-card"><div className="section-heading"><h2>{t("caseTimeline")}</h2><Clock3 /></div><ol className="timeline">{[...request.timeline].reverse().map((event, index) => <li key={event.id} className={index === 0 ? "current" : ""}><span /><div><time>{new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-IQ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Baghdad" }).format(new Date(event.occurredAt))}</time><strong>{event.title[locale]}</strong>{event.detail && <p>{event.detail[locale]}</p>}</div></li>)}</ol></section><aside className="case-aside"><div className="summary-card"><span className="summary-icon"><HeartPulse /></span><h3>{t("status")}</h3><StatusBadge status={request.status} /><p><MapPin />{request.address.district}</p><p><ShieldCheck />{t("privacyNote")}</p></div>{request.visit?.vitals && <div className="summary-card"><div className="section-heading"><h3>{t("vitals")}</h3><Activity /></div><div className="vital-summary"><span><strong>{request.visit.vitals.systolic}/{request.visit.vitals.diastolic}</strong><small>mmHg</small></span><span><strong>{request.visit.vitals.heartRate}</strong><small>bpm</small></span><span><strong>{request.visit.vitals.temperature}</strong><small>°C</small></span><span><strong>{request.visit.vitals.spo2}</strong><small>SpO₂</small></span></div></div>}{completed && <div className="summary-card rating-card"><h3>{request.rating ? t("ratingSent") : t("rateExperience")}</h3>{request.rating ? <div className="sent-rating"><CheckCircle2 />{request.rating.overall}/5</div> : <><div className="stars">{[1,2,3,4,5].map((star) => <button key={star} aria-label={`${star}`} onClick={() => setRating(star)} className={star <= rating ? "selected" : ""}><Star /></button>)}</div><textarea placeholder={t("optionalComment")} value={comment} onChange={(event) => setComment(event.target.value)} /><button className="primary-button" onClick={() => void sendRating()}>{t("sendRating")}</button></>}</div>}</aside></div></div></AppShell>;
}
