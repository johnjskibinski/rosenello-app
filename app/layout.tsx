import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rosenello Production',
  description: 'Production management for Rosenello',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
