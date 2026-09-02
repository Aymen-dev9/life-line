import type { Metadata } from "next";
import { BookingWizard } from "./wizard";

export const metadata: Metadata = { title: "Home nursing" };

export default function BookingPage() {
  return <BookingWizard />;
}

