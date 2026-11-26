import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { WakeBanner } from "@/components/WakeBanner";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "CampusBazaar", template: "%s · CampusBazaar" },
  description: "Buy and sell used books, gadgets and furniture with students on your campus.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main className="container page">
            <WakeBanner />
            {children}
          </main>
          <footer className="footer">
            <div className="container">CampusBazaar · by students, for students. Built for the Kalvium course.</div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
