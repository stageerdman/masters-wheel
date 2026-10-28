import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/elements/AppHeader/AppHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Master's Circle",
  description: "Mastery platform prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
