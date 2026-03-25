import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import SessionProvider from "@/components/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GroupSplit",
  description: "Track group expenses effortlessly",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>
        <SessionProvider session={session}>
          {session && <Navbar session={session} />}
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
