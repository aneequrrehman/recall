import type { Metadata } from 'next'
import './styles/global.scss'

export const metadata: Metadata = {
  title: 'Recall Example',
  description: 'Example using @youcraft/recall with Vercel Workflow (WDK)',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="theme-light">{children}</body>
    </html>
  )
}
