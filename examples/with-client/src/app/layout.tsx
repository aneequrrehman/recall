import type { Metadata } from 'next'
import './styles/global.scss'

export const metadata: Metadata = {
  title: 'Recall Client Example',
  description: 'Example using @youcraft/recall-client to connect to hosted Recall API',
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
