import './globals.css'

export const metadata = {
  title: 'Badminton Ultimate Pro',
  description: 'แอปจัดการก๊วนแบดมินตันอบอุ่น',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
