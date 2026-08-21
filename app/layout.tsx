import "./globals.css";
import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://www.getpermitwatch.com"
  ),

  title: {
    default:
      "PermitWatch | Boiler Permit & Compliance Management",
    template: "%s | PermitWatch",
  },

  description:
    "Track boiler permits, expiration dates, compliance status, documents, and renewal reminders across your property portfolio with PermitWatch.",

  applicationName: "PermitWatch",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: "/",
    siteName: "PermitWatch",
    title:
      "PermitWatch | Boiler Permit & Compliance Management",
    description:
      "Track boiler permits, expiration dates, compliance status, documents, and renewal reminders across your property portfolio.",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "PermitWatch | Boiler Permit & Compliance Management",
    description:
      "Track boiler permits, expiration dates, compliance status, documents, and renewal reminders across your property portfolio.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}