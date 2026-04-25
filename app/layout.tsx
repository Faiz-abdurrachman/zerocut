import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import ClientRoot from "@/components/ClientRoot"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })

export const metadata: Metadata = {
  title: "Brief",
  description: "Trustless freelance escrow with AI dispute resolution on Monad. 0% platform fee.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
