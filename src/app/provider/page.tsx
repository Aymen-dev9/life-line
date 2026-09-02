"use client";

import { Activity, CheckCircle2, Clock3, MapPin, Navigation, Play, RefreshCw, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";
import type { Provider } from "@/modules/providers/eligibility";
import type { CareRequest, Patient } from "@/modules/requests/types";

type AssignedRequest = CareRequest & { patient?: Patient };
type ProviderView = { provider: Provider; requests: AssignedRequest[] };
type ClinicalDraft = { systolic: number; diastolic: number; heartRate: number; temperature: number; spo2: number; clinicalNote: string; followUpRequired: boolean };

export default function ProviderPage() {
  const { locale, t } = useI18n();
  const [view, setView] = useState<ProviderView | null>(null);
  const [busy, setBusy] = useState(false);
  const [clinical, setClinical] = useState({ systolic: 122, diastolic: 78, heartRate: 76, temperature: 36.7, spo2: 98, clinicalNote: "", followUpRequired: false });
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/demo", { headers: { "x-demo-role": "NURSE", "x-demo-actor": "provider-female-1" }, cache: "no-store" });
    const payload = await response.json() as { data: ProviderView };
    setView(payload.data);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/demo", { headers: { "x-demo-role": "NURSE", "x-demo-actor": "provider-female-1" }, cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { data: ProviderView }) => setView(payload.data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const request = view?.requests.find((item) => !["COMPLETED", "FOLLOW_UP_REQUIRED"].includes(item.status)) ?? view?.requests[0];

  async function transition(action: "accept" | "onTheWay" | "arrive" | "start") {
    if (!request) return;
    setBusy(true);
    await fetch("/api/v1/demo", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "NURSE", "x-demo-actor": "provider-female-1" }, body: JSON.stringify({ action: "providerTransition", requestId: request.id, transition: action }) });
    await load();
    setBusy(false);
  }

  async function complete() {
    if (!request) return;
    setBusy(true);
    const { clinicalNote, followUpRequired, ...vitals } = clinical;
    const response = await fetch("/api/v1/demo", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "NURSE", "x-demo-actor": "provider-female-1" }, body: JSON.stringify({ action: "completeVisit", requestId: request.id, vitals, clinicalNote, followUpRequired }) });
    if (response.ok) await load();
    setBusy(false);
  }

  return (
    <AppShell surface="provider" title={t("provider")}>
      <div className="provider-page">
        <header className="surface-heading"><div><p className="eyebrow">{view?.provider.name[locale] ?? t("provider")}</p><h1>{t("providerTitle")}</h1><p>{t("providerSubtitle")}</p></div><div className="provider-state"><span />{t("available")}</div></header>
        {!request && <div className="empty-state"><span><Stethoscope size={32} /></span><div><strong>{t("noAssignments")}</strong><p><a href="/operations">{t("operations")}</a></p></div></div>}
        {request && <>
          <article className="visit-hero">
            <div className="visit-hero-head"><div><span className="reference">{request.reference}</span><h2>{t("homeNursing")}</h2></div><StatusBadge status={request.status} /></div>
            <div className="visit-patient"><span className="avatar large">{request.patient?.name[locale].slice(0, 1)}</span><div><strong>{request.patient?.name[locale]}</strong><small>{request.patient?.age} {t("years")}</small></div></div>
            <div className="visit-facts"><p><Clock3 />{request.schedule.type === "ASAP" ? t("asap") : request.schedule.window}</p><p><MapPin />{request.address.district} · {request.address.landmark}</p></div>
            {["PROVIDER_ACCEPTED", "PROVIDER_ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED", "FOLLOW_UP_REQUIRED"].includes(request.status) && <div className="authorized-location"><Navigation size={18} /><div><strong>{t("exactLocationAuthorized")}</strong><p>{request.address.instructions}</p></div></div>}
            <div className="workflow-actions">
              {request.status === "ASSIGNED" && <button className="primary-button" disabled={busy} onClick={() => void transition("accept")}><CheckCircle2 />{t("acceptVisit")}</button>}
              {request.status === "PROVIDER_ACCEPTED" && <button className="primary-button" disabled={busy} onClick={() => void transition("onTheWay")}><Navigation />{t("startRoute")}</button>}
              {request.status === "PROVIDER_ON_THE_WAY" && <button className="primary-button" disabled={busy} onClick={() => void transition("arrive")}><MapPin />{t("markArrived")}</button>}
              {request.status === "ARRIVED" && <button className="primary-button" disabled={busy} onClick={() => void transition("start")}><Play />{t("startVisit")}</button>}
              <button className="secondary-button" onClick={() => void load()}><RefreshCw />{t("refresh")}</button>
            </div>
          </article>
          {request.status === "IN_PROGRESS" && <ClinicalForm value={clinical} setValue={setClinical} complete={() => void complete()} busy={busy} />}
          {["COMPLETED", "FOLLOW_UP_REQUIRED"].includes(request.status) && <div className="completion-panel"><CheckCircle2 size={34} /><h2>{t("completedToday")}</h2></div>}
        </>}
      </div>
    </AppShell>
  );
}

function ClinicalForm({ value, setValue, complete, busy }: { value: ClinicalDraft; setValue: React.Dispatch<React.SetStateAction<ClinicalDraft>>; complete: () => void; busy: boolean }) {
  const { t } = useI18n();
  const numberField = (key: "systolic" | "diastolic" | "heartRate" | "temperature" | "spo2", label: string, unit: string) => <label><span>{label}</span><div><input type="number" step={key === "temperature" ? "0.1" : "1"} value={value[key]} onChange={(event) => setValue((current) => ({ ...current, [key]: Number(event.target.value) }))} /><small>{unit}</small></div></label>;
  return <section className="clinical-card"><div className="section-heading"><div><p className="eyebrow">{t("clinicalDocumentation")}</p><h2>{t("vitals")}</h2></div><Activity /></div><div className="vitals-grid">{numberField("systolic", t("systolic"), "mmHg")}{numberField("diastolic", t("diastolic"), "mmHg")}{numberField("heartRate", t("heartRate"), "bpm")}{numberField("temperature", t("temperature"), "°C")}{numberField("spo2", t("oxygen"), "%")}</div><label className="note-field"><span>{t("clinicalNote")}</span><textarea rows={5} placeholder={t("clinicalNotePlaceholder")} value={value.clinicalNote} onChange={(event) => setValue((current) => ({ ...current, clinicalNote: event.target.value }))} /></label><label className="check-field"><input type="checkbox" checked={value.followUpRequired} onChange={(event) => setValue((current) => ({ ...current, followUpRequired: event.target.checked }))} /><span>{t("followUp")}</span></label><button className="primary-button" disabled={busy || value.clinicalNote.trim().length < 10} onClick={complete}><CheckCircle2 />{t("completeVisit")}</button></section>;
}
