"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="center-state"><h1>تعذر تحميل الصفحة</h1><p>Something went wrong.</p><button className="primary-button" onClick={reset}>Try again · حاول مجدداً</button></div>;
}
