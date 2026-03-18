import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WebVakwerk Ticket System',
  description: 'Internal agency operations management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-950 antialiased">{children}</body>
    </html>
  )
}
