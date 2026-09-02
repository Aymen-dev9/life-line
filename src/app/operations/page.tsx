"use client";

import { CheckCircle2, Clock3, MapPin, RefreshCw, ShieldCheck, Siren, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";
import type { Provider } from "@/modules/providers/eligibility";
import type { CareRequest } from "@/modules/requests/types";

type ProviderWithEligibility = Provider & { eligibilityByRequest: Record<string, { eligible: boolean; reasons: string[] }> };
type OpsView = { requests: CareRequest[]; providers: ProviderWithEligibility[] };

export default function OperationsPage() {
  const { locale, t } = useI18n();
  const [view, setView] = useState<OpsView | null>(null);
  const [working, setWorking] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/demo", { headers: { "x-demo-role": "DISPATCHER", "x-demo-actor": "dispatcher-1" }, cache: "no-store" });
    const payload = await response.json() as { data: OpsView };
    setView(payload.data);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/demo", { headers: { "x-demo-role": "DISPATCHER", "x-demo-actor": "dispatcher-1" }, cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { data: OpsView }) => setView(payload.data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => ({
    pending: view?.requests.filter((request) => request.status === "PENDING_ASSIGNMENT").length ?? 0,
    route: view?.requests.filter((request) => request.status === "PROVIDER_ON_THE_WAY").length ?? 0,
    active: view?.requests.filter((request) => ["ARRIVED", "IN_PROGRESS"].includes(request.status)).length ?? 0,
    complete: view?.requests.filter((request) => ["COMPLETED", "FOLLOW_UP_REQUIRED"].includes(request.status)).length ?? 0
  }), [view]);

  async function assign(requestId: string, providerId: string) {
    setWorking(providerId);
    await fetch("/api/v1/demo", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "DISPATCHER", "x-demo-actor": "dispatcher-1" }, body: JSON.stringify({ action: "assignProvider", requestId, providerId }) });
    setWorking("");
    await load();
  }

  return (
    <AppShell surface="operations" title={t("operations")}>
      <div className="desktop-page">
        <header className="surface-heading"><div><p className="eyebrow">{t("operations")}</p><h1>{t("opsTitle")}</h1><p>{t("opsSubtitle")}</p></div><button className="secondary-button" onClick={() => void load()}><RefreshCw size={17} />{t("refresh")}</button></header>
        <section className="metric-grid">
          <Metric icon={<Clock3 />} label={t("pendingAssignment")} value={metrics.pending} tone="amber" />
          <Metric icon={<MapPin />} label={t("onTheWay")} value={metrics.route} tone="blue" />
          <Metric icon={<Siren />} label={t("inProgress")} value={metrics.active} tone="rose" />
          <Metric icon={<CheckCircle2 />} label={t("completedToday")} value={metrics.complete} tone="green" />
        </section>
        <section className="ops-queue">
          <div className="section-heading"><h2>{t("requestQueue")}</h2><span>{view?.requests.length ?? 0}</span></div>
          {!view?.requests.length && <div className="empty-state"><span><UserCheck size={31} /></span><div><strong>{t("noRequests")}</strong></div></div>}
          {view?.requests.map((request) => {
            const eligible = view.providers.filter((provider) => provider.eligibilityByRequest[request.id]?.eligible);
            const ineligible = view.providers.filter((provider) => !provider.eligibilityByRequest[request.id]?.eligible);
            return <article className="dispatch-card" key={request.id}>
              <div className="dispatch-main">
                <div className="request-card-top"><span className="reference">{request.reference}</span><StatusBadge status={request.status} /></div>
                <h3>{t("homeNursing")}</h3>
                <dl className="request-facts">
                  <div><dt>{t("areaOnly")}</dt><dd><MapPin size={15} />{request.address.district}</dd></div>
                  <div><dt>{t("preferredStaff")}</dt><dd>{request.genderPreference === "FEMALE" ? t("female") : request.genderPreference === "MALE" ? t("male") : t("noPreference")}</dd></div>
                  <div><dt>{t("time")}</dt><dd>{request.schedule.type === "ASAP" ? t("asap") : request.schedule.window}</dd></div>
                  <div><dt>{t("requiredSkills")}</dt><dd>Home nursing · Vital signs</dd></div>
                </dl>
              </div>
              <div className="assignment-panel">
                <h4><ShieldCheck size={18} />{t("eligibleProviders")}</h4>
                {eligible.map((provider) => <div className="provider-option" key={provider.id}><span className="avatar">{provider.name[locale].slice(0, 1)}</span><span><strong>{provider.name[locale]}</strong><small>{provider.rating} ★ · {t("verified")}</small></span><button className="small-button" disabled={request.status !== "PENDING_ASSIGNMENT" || working === provider.id} onClick={() => void assign(request.id, provider.id)}>{request.assignedProviderId === provider.id ? t("assigned") : t("assign")}</button></div>)}
                <details><summary>{ineligible.length} {t("notEligible")}</summary>{ineligible.map((provider) => <p key={provider.id}>{provider.name[locale]} · {provider.eligibilityByRequest[request.id]?.reasons.join(", ")}</p>)}</details>
              </div>
            </article>;
          })}
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) { return <div className={`metric-card metric-${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
