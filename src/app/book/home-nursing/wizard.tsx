"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Crosshair, FileText, Map, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { appConfig } from "@/config/app";
import { useI18n } from "@/i18n/provider";
import { homeNursingService } from "@/modules/catalog/home-nursing";
import { hasEmergencyRedFlag, isQuestionVisible, type IntakeQuestion } from "@/modules/catalog/types";
import type { GenderPreference } from "@/modules/providers/eligibility";
import type { Address, CareRequest, Patient } from "@/modules/requests/types";

type PatientApiView = { patients: Patient[]; addresses: Address[] };
type Draft = {
  patientId?: string;
  answers: Record<string, unknown>;
  genderPreference?: GenderPreference;
  schedule?: CareRequest["schedule"];
  address?: Address;
};
type ManualAddressDraft = { city: string; district: string; landmark: string; instructions: string };

const emptyDraft: Draft = { answers: {} };
const steps = ["patient", "intake", "gender", "time", "location", "review"] as const;
const DRAFT_STORAGE_KEY = "care-home-nursing-draft:v1";

export function BookingWizard() {
  const { locale, t } = useI18n();
  const [step, setStep] = useState(0);
  const [view, setView] = useState<PatientApiView | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [validation, setValidation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CareRequest | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "ready" | "denied">("idle");
  const [manual, setManual] = useState({ city: locale === "ar" ? "بغداد" : "Baghdad", district: "", landmark: "", instructions: "" });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) window.setTimeout(() => setDraft(JSON.parse(saved) as Draft), 0);
    } catch { /* storage can be unavailable or contain an invalid prior draft */ }
    void fetch("/api/v1/demo", { headers: { "x-demo-role": "PATIENT" }, cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data: PatientApiView }) => setView(payload.data));
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)); } catch { /* keep the active in-memory draft */ }
  }, [draft]);

  const patient = view?.patients.find((item) => item.id === draft.patientId);
  const isEmergency = hasEmergencyRedFlag(homeNursingService, draft.answers);
  const currentStep = steps[step];
  const directionIcon = locale === "ar" ? <ChevronLeft size={19} /> : <ChevronRight size={19} />;

  function next() {
    setValidation("");
    if (currentStep === "patient" && !draft.patientId) return setValidation(t("selectRequired"));
    if (currentStep === "intake") {
      const missing = homeNursingService.questions.some((question) => question.required && isQuestionVisible(question, draft.answers) && !draft.answers[question.id]);
      if (missing) return setValidation(t("selectRequired"));
      if (isEmergency) return;
    }
    if (currentStep === "gender" && !draft.genderPreference) return setValidation(t("selectRequired"));
    if (currentStep === "time" && !draft.schedule) return setValidation(t("selectRequired"));
    if (currentStep === "location" && !draft.address) return setValidation(t("selectRequired"));
    setStep((value) => Math.min(value + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!draft.patientId || !draft.genderPreference || !draft.schedule || !draft.address) return;
    setSubmitting(true);
    setValidation("");
    try {
      const response = await fetch("/api/v1/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "PATIENT", "x-demo-actor": "account-caregiver" },
        body: JSON.stringify({ action: "createRequest", ...draft })
      });
      if (!response.ok) throw new Error("request failed");
      const payload = await response.json() as { data: CareRequest };
      setCreated(payload.data);
      try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* successful server state is authoritative */ }
    } catch {
      setValidation(t("requestError"));
    } finally {
      setSubmitting(false);
    }
  }

  function useCurrentLocation() {
    setGpsState("loading");
    if (!("geolocation" in navigator)) return setGpsState("denied");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((value) => ({ ...value, address: {
          id: `gps-${Date.now()}`,
          label: { ar: "الموقع الحالي", en: "Current location" },
          city: "Baghdad",
          district: "Current GPS area",
          landmark: "Pin confirmed by patient",
          instructions: "",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          zoneId: "baghdad-central"
        } }));
        setGpsState("ready");
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  function chooseMap() {
    setDraft((value) => ({ ...value, address: {
      id: "map-pin-baghdad",
      label: { ar: "موقع على الخريطة", en: "Map pin" },
      city: "Baghdad",
      district: "Al-Mansour",
      landmark: "Pin adjusted by patient",
      instructions: "",
      latitude: 33.3152,
      longitude: 44.3661,
      zoneId: "baghdad-central"
    } }));
    setGpsState("ready");
  }

  function saveManual() {
    if (!manual.city || !manual.district || !manual.landmark) return setValidation(t("selectRequired"));
    setDraft((value) => ({ ...value, address: {
      id: `manual-${Date.now()}`,
      label: { ar: "عنوان جديد", en: "New address" },
      city: manual.city,
      district: manual.district,
      landmark: manual.landmark,
      instructions: manual.instructions,
      latitude: 33.3152,
      longitude: 44.3661,
      zoneId: "baghdad-central"
    } }));
    setGpsState("ready");
  }

  if (created) return <Confirmation request={created} />;

  return (
    <AppShell>
      <div className="wizard-shell">
        <div className="wizard-header">
          <Link href="/" className="back-link">{locale === "ar" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}{t("back")}</Link>
          <p className="eyebrow">{t("homeNursing")}</p>
          <h1>{t("bookingTitle")}</h1>
          <p>{t("bookingIntro")}</p>
          <div className="progress-line"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          <small>{t("step")} {step + 1} {t("of")} {steps.length}</small>
        </div>

        <div className="wizard-card">
          {currentStep === "patient" && <PatientStep patients={view?.patients ?? []} selected={draft.patientId} select={(patientId) => setDraft((value) => ({ ...value, patientId }))} />}
          {currentStep === "intake" && <IntakeStep answers={draft.answers} update={(id, answer) => setDraft((value) => ({ ...value, answers: { ...value.answers, [id]: answer } }))} emergency={isEmergency} />}
          {currentStep === "gender" && <GenderStep value={draft.genderPreference} update={(genderPreference) => setDraft((value) => ({ ...value, genderPreference }))} />}
          {currentStep === "time" && <TimeStep value={draft.schedule} update={(schedule) => setDraft((value) => ({ ...value, schedule }))} />}
          {currentStep === "location" && <LocationStep view={view} draft={draft} setDraft={setDraft} gpsState={gpsState} useCurrent={useCurrentLocation} chooseMap={chooseMap} manual={manual} setManual={setManual} saveManual={saveManual} />}
          {currentStep === "review" && <Review patient={patient} draft={draft} />}

          {validation && <div className="inline-error" role="alert"><AlertTriangle size={18} />{validation}</div>}
          {!isEmergency && <div className="wizard-actions">
            <button className="secondary-button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>{t("back")}</button>
            {currentStep === "review" ? (
              <button className="primary-button" disabled={submitting} onClick={() => void submit()}>{submitting ? t("submitting") : t("confirmRequest")} {directionIcon}</button>
            ) : (
              <button className="primary-button" onClick={next}>{t("continue")} {directionIcon}</button>
            )}
          </div>}
        </div>
      </div>
    </AppShell>
  );
}

function PatientStep({ patients, selected, select }: { patients: Patient[]; selected?: string; select: (id: string) => void }) {
  const { locale, t } = useI18n();
  return <Step title={t("whoFor")} hint={t("selectPatientHint")} icon={<Sparkles />}><div className="choice-list">{patients.map((patient) => <button key={patient.id} onClick={() => select(patient.id)} className={`choice-card ${selected === patient.id ? "selected" : ""}`}><span className="avatar">{patient.name[locale].slice(0, 1)}</span><span><strong>{patient.name[locale]}</strong><small>{patient.relationship === "MOTHER" ? t("mother") : t("self")} · {patient.age} {t("years")}</small></span>{selected === patient.id && <Check size={20} />}</button>)}</div></Step>;
}

function IntakeStep({ answers, update, emergency }: { answers: Record<string, unknown>; update: (id: string, answer: unknown) => void; emergency: boolean }) {
  const { locale, t } = useI18n();
  return <Step title={t("essentialQuestions")} hint={t("essentialHint")} icon={<FileText />}>{homeNursingService.questions.filter((q) => isQuestionVisible(q, answers)).map((question) => <Question key={question.id} question={question} value={answers[question.id]} update={(answer) => update(question.id, answer)} locale={locale} />)}{emergency && <div className="emergency-card" role="alert"><span><AlertTriangle size={28} /></span><div><h3>{t("emergencyTitle")}</h3><p>{t("emergencyBody")}</p><strong>{appConfig.emergency.phone || t("emergencyConfigured")}</strong></div></div>}</Step>;
}

function Question({ question, value, update, locale }: { question: IntakeQuestion; value: unknown; update: (answer: unknown) => void; locale: "ar" | "en" }) {
  if (question.type === "text") return <fieldset className="question"><legend>{question.label[locale]}</legend><textarea rows={3} value={typeof value === "string" ? value : ""} onChange={(event) => update(event.target.value)} /></fieldset>;
  return <fieldset className="question"><legend>{question.label[locale]}{question.required && <sup>*</sup>}</legend>{question.help && <p>{question.help[locale]}</p>}<div className="answer-chips">{question.options?.map((option) => { const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value; return <button type="button" key={option.value} className={selected ? "selected" : ""} onClick={() => { if (question.type === "multi_choice") { const current = Array.isArray(value) ? value as string[] : []; update(selected ? current.filter((item) => item !== option.value) : [...current, option.value]); } else update(option.value); }}>{selected && <Check size={16} />}{option.label[locale]}</button>; })}</div></fieldset>;
}

function GenderStep({ value, update }: { value?: GenderPreference; update: (value: GenderPreference) => void }) {
  const { t } = useI18n();
  return <Step title={t("genderTitle")} hint={t("genderHint")} icon={<ShieldCheck />}><div className="gender-grid"><Choice value="FEMALE" selected={value} label={t("female")} symbol="♀" update={update} /><Choice value="MALE" selected={value} label={t("male")} symbol="♂" update={update} /><Choice value="NO_PREFERENCE" selected={value} label={t("noPreference")} symbol="—" update={update} /></div></Step>;
}

function Choice({ value, selected, label, symbol, update }: { value: GenderPreference; selected?: GenderPreference; label: string; symbol: string; update: (value: GenderPreference) => void }) {
  return <button className={`gender-card ${value === selected ? "selected" : ""}`} onClick={() => update(value)}><span>{symbol}</span><strong>{label}</strong>{value === selected && <Check size={19} />}</button>;
}

function TimeStep({ value, update }: { value?: CareRequest["schedule"]; update: (value: CareRequest["schedule"]) => void }) {
  const { t } = useI18n();
  return <Step title={t("whenTitle")} icon={<CalendarDays />}><div className="choice-list"><button className={`choice-card ${value?.type === "ASAP" ? "selected" : ""}`} onClick={() => update({ type: "ASAP" })}><span className="choice-icon"><Clock3 /></span><span><strong>{t("asap")}</strong><small>{t("asapHint")}</small></span>{value?.type === "ASAP" && <Check />}</button><div className="slot-group"><strong>{t("scheduleLater")}</strong>{[t("todayEvening"), t("tomorrowMorning"), t("tomorrowNoon")].map((window, index) => <button key={window} className={value?.window === window ? "selected" : ""} onClick={() => update({ type: "SCHEDULED", startAt: new Date(Date.now() + (index + 1) * 86400000).toISOString(), window })}>{window}{value?.window === window && <Check size={16} />}</button>)}</div></div></Step>;
}

function LocationStep({ view, draft, setDraft, gpsState, useCurrent, chooseMap, manual, setManual, saveManual }: { view: PatientApiView | null; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; gpsState: string; useCurrent: () => void; chooseMap: () => void; manual: ManualAddressDraft; setManual: React.Dispatch<React.SetStateAction<ManualAddressDraft>>; saveManual: () => void }) {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<"saved" | "manual" | null>(null);
  return <Step title={t("whereTitle")} icon={<MapPin />}><div className="location-actions"><button onClick={useCurrent}><Crosshair />{t("currentLocation")}</button><button onClick={chooseMap}><Map />{t("chooseMap")}</button><button onClick={() => setMode("saved")}><MapPin />{t("savedAddress")}</button><button onClick={() => setMode("manual")}><FileText />{t("manualAddress")}</button></div>{gpsState === "loading" && <div className="location-feedback">{t("gettingLocation")}</div>}{gpsState === "denied" && <div className="inline-error"><AlertTriangle />{t("locationDenied")}</div>}{mode === "saved" && <div className="choice-list">{view?.addresses.map((address) => <button key={address.id} className={`choice-card ${draft.address?.id === address.id ? "selected" : ""}`} onClick={() => setDraft((value) => ({ ...value, address }))}><span className="choice-icon"><MapPin /></span><span><strong>{address.label[locale]}</strong><small>{address.district} · {address.landmark}</small></span>{draft.address?.id === address.id && <Check />}</button>)}</div>}{mode === "manual" && <div className="manual-grid"><label>{t("city")}<input value={manual.city} onChange={(e) => setManual((v) => ({ ...v, city: e.target.value }))} /></label><label>{t("district")}<input value={manual.district} onChange={(e) => setManual((v) => ({ ...v, district: e.target.value }))} /></label><label>{t("nearestLandmark")}<input value={manual.landmark} onChange={(e) => setManual((v) => ({ ...v, landmark: e.target.value }))} /></label><label>{t("accessInstructions")}<textarea value={manual.instructions} onChange={(e) => setManual((v) => ({ ...v, instructions: e.target.value }))} /></label><button className="secondary-button" onClick={saveManual}>{t("confirmLocation")}</button></div>}{draft.address && <div className="map-confirm"><div className="mock-map"><span className="map-road road-one" /><span className="map-road road-two" /><MapPin size={31} /></div><div><strong>{t("locationReady")}</strong><p>{draft.address.district} · {draft.address.landmark}</p></div></div>}</Step>;
}

function Review({ patient, draft }: { patient?: Patient; draft: Draft }) {
  const { locale, t } = useI18n();
  const gender = draft.genderPreference === "FEMALE" ? t("female") : draft.genderPreference === "MALE" ? t("male") : t("noPreference");
  return <Step title={t("reviewTitle")} hint={t("reviewHint")} icon={<ShieldCheck />}><div className="review-list"><ReviewRow label={t("patient")} value={patient?.name[locale] ?? "—"} /><ReviewRow label={t("service")} value={t("homeNursing")} /><ReviewRow label={t("staffPreference")} value={gender} /><ReviewRow label={t("time")} value={draft.schedule?.type === "ASAP" ? t("asap") : draft.schedule?.window ?? "—"} /><ReviewRow label={t("location")} value={`${draft.address?.district ?? ""} · ${draft.address?.landmark ?? ""}`} /><ReviewRow label={t("estimatedCost")} value={`35,000 ${appConfig.market.currency}`} note={t("cashPayment")} /></div><div className="privacy-callout"><ShieldCheck /><p>{t("privacyNote")}</p></div></Step>;
}

function ReviewRow({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="review-row"><span>{label}</span><div><strong>{value}</strong>{note && <small>{note}</small>}</div></div>; }

function Step({ title, hint, icon, children }: { title: string; hint?: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="step-panel"><div className="step-title"><span>{icon}</span><div><h2>{title}</h2>{hint && <p>{hint}</p>}</div></div>{children}</section>; }

function Confirmation({ request }: { request: CareRequest }) {
  const { t } = useI18n();
  return <AppShell><div className="confirmation"><span className="success-mark"><Check size={36} /></span><p className="eyebrow">{request.reference}</p><h1>{t("requestConfirmed")}</h1><p>{t("requestConfirmedHint")}</p><div className="confirmation-reference"><span>{request.caseReference}</span><strong>{t("pendingAssignment")}</strong></div><Link className="primary-button" href={`/case/${request.id}`}>{t("viewTimeline")}</Link><Link className="text-link" href="/operations">{t("operations")}</Link></div></AppShell>;
}
