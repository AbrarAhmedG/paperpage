import './globals.css'

export const metadata = {
  title: 'PaperPage — Sketch to Site',
  description: 'Turn a hand-drawn sketch into an editable, exportable web page.',
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