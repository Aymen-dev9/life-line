"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, HeartPulse, ImagePlus, Lock, Pill, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useContent } from "./content-provider";
import { api, errorKey, normalizePhone } from "./client";
import type { ContentKey } from "./content";
import { LocationPicker, type SelectedLocation } from "./location-picker";
import { SiteFooter } from "./footer";

type PublicService = { id: string; name: string };

// Public shell — no sidebar, no auth. A small, unobtrusive admin-login link lives in the header.
export function PublicShell({ children }: { children: ReactNode }) {
  const { c } = useContent();
  return <div className="care-public" dir="rtl" lang="ar">
    <header className="care-public-top">
      <Link href="/" className="care-public-brand"><span><HeartPulse size={22} /></span><div><strong>{c("brand.name")}</strong><small>{c("brand.tagline")}</small></div></Link>
      <Link href="/admin/login" className="care-public-admin"><Lock size={16} />{c("nav.adminLogin")}</Link>
    </header>
    <main className="care-public-main">{children}</main>
    <SiteFooter className="care-public-footer" />
  </div>;
}

export function PublicHome() {
  const { c } = useContent();
  return <PublicShell>
    <header className="care-heading"><p className="care-eyebrow">{c("home.eyebrow")}</p><h1>{c("home.title")}</h1><p>{c("home.description")}</p></header>
    <section className="care-choice-grid">
      <Link href="/services/request" className="care-choice medical"><span className="care-choice-icon"><Stethoscope size={31} /></span><h2>{c("nav.medical")}</h2><p>{c("home.medicalDescription")}</p><span className="care-choice-action">{c("home.request")}<ArrowLeft size={19} /></span></Link>
      <Link href="/pharmacy/request" className="care-choice pharmacy"><span className="care-choice-icon"><Pill size={31} /></span><h2>{c("nav.pharmacy")}</h2><p>{c("home.pharmacyDescription")}</p><span className="care-choice-action">{c("home.request")}<ArrowLeft size={19} /></span></Link>
    </section>
    <p className="care-public-note"><ShieldCheck size={17} />{c("public.noAccount")}</p>
  </PublicShell>;
}

export function PublicRequest({ kind, services }: { kind: "medical" | "pharmacy"; services: PublicService[] }) {
  const { c } = useContent();
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<ContentKey | null>(null);
  const submissionKey = useRef<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string>("");

  function chooseFile(next: File | null) {
    if (previewUrl.current) { URL.revokeObjectURL(previewUrl.current); previewUrl.current = ""; }
    setFile(next);
    if (next) { const url = URL.createObjectURL(next); previewUrl.current = url; setPreview(url); } else setPreview("");
  }
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    if (!location) { setMessage("field.locationRequired"); return; }
    const form = new FormData(event.currentTarget);
    form.set("kind", kind); form.set("phone", normalizePhone(String(form.get("phone"))));
    form.set("serviceId", String(form.get("serviceId") || "")); form.set("medicine", String(form.get("medicine") || "")); form.set("gender", String(form.get("gender") || "any"));
    form.set("latitude", String(location.lat)); form.set("longitude", String(location.lng)); form.set("formattedAddress", location.address || "");
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    form.set("submissionKey", submissionKey.current);
    if (file) form.set("image", file); else form.delete("image");
    setBusy(true); setMessage(null);
    try { const result = await api<{ reference: string }>("/api/care/public-requests", { method: "POST", body: form }); setReference(result.reference); }
    catch (error) { setMessage(errorKey(error)); submissionKey.current = ""; } finally { setBusy(false); }
  }

  if (reference) return <PublicShell><div className="care-success"><CheckCircle2 size={56} /><h1>{c("request.success")}</h1>
    <div className="care-reference-box"><span>{c("public.referenceLabel")}</span><strong dir="ltr">{reference}</strong><span className="care-status pending">{c("public.pendingStatus")}</span></div>
    <p>{c("request.successHint")}</p>
    <div className="care-inline"><Link href="/" className="care-secondary">{c("public.backHome")}</Link><Link href={kind === "medical" ? "/services/request" : "/pharmacy/request"} className="care-primary" onClick={() => { setReference(""); submissionKey.current = ""; }}>{c("public.newRequest")}</Link></div>
  </div></PublicShell>;

  return <PublicShell>
    <header className="care-heading"><h1>{c(kind === "medical" ? "request.title" : "pharmacy.title")}</h1><p>{c(kind === "medical" ? "request.description" : "pharmacy.description")}</p></header>
    <form onSubmit={event => void submit(event)} className="care-form">
      <section className="care-panel"><h2><UserRound size={21} />{c("request.contact")}</h2>
        <div className="care-field-grid">
          <label>{c("field.name")}<input name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder={c("field.namePlaceholder")} /></label>
          <label>{c("field.phone")}<input name="phone" type="tel" dir="ltr" autoComplete="tel" required placeholder={c("login.phonePlaceholder")} /></label>
          <label>{c("field.patientGender")} <span className="care-muted">({c("common.optional")})</span><select name="clientGender" defaultValue=""><option value="">{c("field.any")}</option><option value="male">{c("field.male")}</option><option value="female">{c("field.female")}</option></select></label>
          <label>{c("field.age")} <span className="care-muted">({c("common.optional")})</span><input name="age" type="number" min="0" max="150" step="1" inputMode="numeric" placeholder={c("field.agePlaceholder")} /></label>
        </div>
        <LocationPicker initial={location} onChange={setLocation} />
        <label>{c("field.landmark")} <span className="care-muted">({c("common.optional")})</span><textarea name="locationNotes" rows={2} maxLength={1000} placeholder={c("field.landmarkPlaceholder")} /></label>
      </section>
      <section className="care-panel"><h2>{c("request.serviceDetails")}</h2>{kind === "medical" ? <>
        <label>{c("field.service")}<select name="serviceId" required defaultValue=""><option value="" disabled>{c("field.selectService")}</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {!services.length && <p role="status">{c("request.noServices")}</p>}
        <fieldset className="care-radio-group"><legend>{c("field.gender")}</legend>{(["male", "female", "any"] as const).map(gender => <label key={gender}><input type="radio" name="gender" value={gender} defaultChecked={gender === "any"} />{c(`field.${gender}`)}</label>)}</fieldset>
      </> : <>
        <label>{c("pharmacy.medicine")}<input name="medicine" maxLength={250} placeholder={c("pharmacy.medicinePlaceholder")} /></label>
        <div className="care-upload"><ImagePlus size={30} /><strong>{c("pharmacy.upload")}</strong><p id="upload-hint">{c("pharmacy.uploadHint")}</p><label className="care-secondary">{c("pharmacy.chooseFile")}<input ref={fileInput} className="care-file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="upload-hint" onChange={event => { const next = event.target.files?.[0]; if (next && (next.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(next.type))) { setMessage("error.FILE"); event.target.value = ""; chooseFile(null); return; } chooseFile(next || null); setMessage(null); }} /></label>{file && <div className="care-upload-preview"><img src={preview} alt={c("pharmacy.upload")} /><span>{file.name}</span><button type="button" className="care-text-button" onClick={() => { chooseFile(null); if (fileInput.current) fileInput.current.value = ""; }}>{c("pharmacy.removeFile")}</button></div>}</div>
      </>}
        <label>{c(kind === "medical" ? "field.details" : "field.notes")}<textarea name="details" rows={4} maxLength={4000} placeholder={c("field.notesPlaceholder")} /></label>
      </section>
      <label className="care-consent"><input type="checkbox" name="consent" value="true" required /><ShieldCheck size={21} /><span>{c("request.consent")}</span></label>
      {message && <div role="alert" className="care-alert error">{c(message)}</div>}
      <button className="care-primary" disabled={busy || (kind === "medical" && !services.length)}>{c(busy ? "common.saving" : "request.submit")}<ArrowLeft size={19} /></button>
    </form>
  </PublicShell>;
}
