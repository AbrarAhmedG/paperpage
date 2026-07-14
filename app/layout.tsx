import './globals.css'

export const metadata = {
  title: 'PaperPage - Design to Code SaaS',
  description: 'AI-Powered Figma-to-Code Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Add suppressHydrationWarning here to stop extension errors */}
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}