import type { Metadata } from "next";
import { AdminLogin } from "@/care/admin-login";

export const metadata: Metadata = { title: "دخول الإدارة", description: "لوحة إدارة منصة الخدمات الطبية المنزلية" };

export default function AdminLoginPage() {
  return <AdminLogin />;
}
