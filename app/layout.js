import './globals.css'

export const metadata = {
  title: 'PayTrack - Intelligent Payroll Management',
  description: 'Modern payroll management system for SMEs and HR departments',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}