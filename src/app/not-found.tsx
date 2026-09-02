import Link from "next/link";

export default function NotFound() {
  return <div className="center-state"><h1>404</h1><p>Page not found · الصفحة غير موجودة</p><Link className="primary-button" href="/">Home · الرئيسية</Link></div>;
}
