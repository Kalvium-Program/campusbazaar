import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
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
          <main className="container page">{children}</main>
          <footer className="footer">
            <div className="container">CampusBazaar: a demo marketplace built for the Kalvium course. Not a real store.</div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
