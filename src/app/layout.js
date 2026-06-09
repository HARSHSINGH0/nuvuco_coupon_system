import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Nuvoco Shabhash Card",
  description: "Reward & Recognition - Sonadih Cement Plant",
  verification: {
    google: 'ZwBjLdnB9FKvE7UdXgmOFTDmJqCFYOFzsOZLBxqGri0', // 👈 replace with your actual code
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
