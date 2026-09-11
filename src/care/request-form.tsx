"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, ShieldCheck, UserRound } from "lucide-react";
import { useContent } from "./content-provider";
import { api, errorKey, normalizePhone } from "./client";
import type { Profile, WorkspaceData } from "./types";
import type { ContentKey } from "./content";
import { LocationPicker, type SelectedLocation } from "./location-picker";
import { PageHeading, type Mutate } from "./workspace";

function ContactFields({ profile }: { profile: Profile }) {
  const { c } = useContent();
  return <div className="care-field-grid"><label>{c("field.name")}<input name="name" autoComplete="name" defaultValue={profile.name} required minLength={2} maxLength={120} placeholder={c("field.namePlaceholder")} /></label><label>{c("field.phone")}<input name="phone" type="tel" dir="ltr" autoComplete="tel" defaultValue={profile.phone} required placeholder={c("login.phonePlaceholder")} /></label><label className="full">{c("field.address")}<textarea name="address" autoComplete="street-address" defaultValue={profile.address} required minLength={5} maxLength={1000} rows={3} placeholder={c("field.addressPlaceholder")} /></label></div>;
}
export function ProfileForm({ profile, mutate, busy }: { profile: Profile; mutate: Mutate; busy: boolean }) {
  const { c } = useContent();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate({ action: "profile", name: form.get("name"), phone: normalizePhone(String(form.get("phone"))), address: form.get("address") }); }
  return <><PageHeading title="profile.title" description="profile.description" /><form onSubmit={submit} className="care-panel care-form"><ContactFields profile={profile} /><button className="care-primary" disabled={busy}>{c(busy ? "common.saving" : "common.save")}</button></form></>;
}
export function RequestForm({ kind, data }: { kind: "medical" | "pharmacy"; data: WorkspaceData }) {
  const { c } = useContent();
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [busy, setBusy] = useState(false), [success, setSuccess] = useState(false);
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
    try { await api("/api/care/requests", { method: "POST", body: form }); setSuccess(true); }
    catch (error) { setMessage(errorKey(error)); } finally { setBusy(false); }
  }
  if (success) return <div className="care-success"><CheckCircle2 size={56} /><h1>{c("request.success")}</h1><p>{c("request.successHint")}</p><Link href="/requests" className="care-primary">{c("request.view")}<ArrowLeft size={18} /></Link></div>;
  return <><PageHeading title={kind === "medical" ? "request.title" : "pharmacy.title"} description={kind === "medical" ? "request.description" : "pharmacy.description"} />
    <form onSubmit={event => void submit(event)} className="care-form">
      <section className="care-panel"><h2><UserRound size={21} />{c("request.contact")}</h2>
        <div className="care-field-grid"><label>{c("field.name")}<input name="name" autoComplete="name" defaultValue={data.user.name} required minLength={2} maxLength={120} placeholder={c("field.namePlaceholder")} /></label><label>{c("field.phone")}<input name="phone" type="tel" dir="ltr" autoComplete="tel" defaultValue={data.user.phone} required placeholder={c("login.phonePlaceholder")} /></label></div>
        <LocationPicker initial={location} onChange={setLocation} />
        <label>{c("field.landmark")} <span className="care-muted">({c("common.optional")})</span><textarea name="locationNotes" rows={2} maxLength={1000} placeholder={c("field.landmarkPlaceholder")} /></label>
      </section>
      <section className="care-panel"><h2>{c("request.serviceDetails")}</h2>{kind === "medical" ? <><label>{c("field.service")}<select name="serviceId" required defaultValue=""><option value="" disabled>{c("field.selectService")}</option>{data.services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{!data.services.some(s => s.active) && <p role="status">{c("request.noServices")}</p>}<fieldset className="care-radio-group"><legend>{c("field.gender")}</legend>{(["male", "female", "any"] as const).map(gender => <label key={gender}><input type="radio" name="gender" value={gender} defaultChecked={gender === "any"} />{c(`field.${gender}`)}</label>)}</fieldset></> : <><label>{c("pharmacy.medicine")}<input name="medicine" maxLength={250} placeholder={c("pharmacy.medicinePlaceholder")} /></label><div className="care-upload"><ImagePlus size={30} /><strong>{c("pharmacy.upload")}</strong><p id="upload-hint">{c("pharmacy.uploadHint")}</p><label className="care-secondary">{c("pharmacy.chooseFile")}<input ref={fileInput} className="care-file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="upload-hint" onChange={event => { const next = event.target.files?.[0]; if (next && (next.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(next.type))) { setMessage("error.FILE"); event.target.value = ""; chooseFile(null); return; } chooseFile(next || null); setMessage(null); }} /></label>{file && <div className="care-upload-preview">{/* Local object URLs cannot use the Next.js image optimizer. */}<img src={preview} alt={c("pharmacy.upload")} /><span>{file.name}</span><button type="button" className="care-text-button" onClick={() => { chooseFile(null); if (fileInput.current) fileInput.current.value = ""; }}>{c("pharmacy.removeFile")}</button></div>}</div></>}
        <label>{c(kind === "medical" ? "field.details" : "field.notes")}<textarea name="details" rows={4} maxLength={4000} placeholder={c("field.notesPlaceholder")} /></label>
      </section>
      <label className="care-consent"><input type="checkbox" name="consent" value="true" required /><ShieldCheck size={21} /><span>{c("request.consent")}</span></label>
      {message && <div role="alert" className="care-alert error">{c(message)}</div>}
      <button className="care-primary" disabled={busy || (kind === "medical" && !data.services.some(s => s.active))}>{c(busy ? "common.saving" : "request.submit")}<ArrowLeft size={19} /></button>
    </form>
  </>;
}
