/* src/app/layout.js */

import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";

import AppLayout from "@/components/AppLayout/AppLayout";

/* --------------------------------------------------
   Font Configuration
-------------------------------------------------- */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

/* --------------------------------------------------
   Application Metadata
-------------------------------------------------- */

export const metadata = {
  title: {
    default: "Hyper — Your Bookmark Library",
    template: "%s | Hyper",
  },
  description: "Discover, organize, and revisit useful websites with Hyper.",
};

/* --------------------------------------------------
   Root Layout
-------------------------------------------------- */

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body className={`${inter.variable} ${dmSans.variable}`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
