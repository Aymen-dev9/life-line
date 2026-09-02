"use client";

import { useI18n } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n/dictionaries";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const key = `status_${status}` as TranslationKey;
  let label = status.replaceAll("_", " ");
  try { label = t(key); } catch { /* preserve safe fallback */ }
  return <span className={`status-badge status-${status.toLowerCase()}`}><span />{label}</span>;
}

