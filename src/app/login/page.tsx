import type { Metadata } from "next";
import { Login } from "@/care/login";

export const metadata: Metadata = { title: "تسجيل الدخول", description: "الدخول إلى منصة الخدمات الطبية المنزلية" };

export default function LoginPage() {
  return <Login />;
}
