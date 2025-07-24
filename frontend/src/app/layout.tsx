// src/app/layout.tsx
import './globals.css'
import { PropsWithChildren } from 'react'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'EESYAI',
  description: 'Your AI chatbot',
}

export default function RootLayout({ children }: PropsWithChildren<{}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Nav />
        {children}
      </body>
    </html>
  )
}

