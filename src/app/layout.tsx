import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ระบบครุภัณฑ์ ภาควิชาจุลชีววิทยา คณะแพทยศาสตร์ มศว",
  description:
    "ระบบบริหารจัดการครุภัณฑ์และอุปกรณ์แบบเรียลไทม์ ภาควิชาจุลชีววิทยา คณะแพทยศาสตร์ มหาวิทยาลัยศรีนครินทรวิโรฒ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
