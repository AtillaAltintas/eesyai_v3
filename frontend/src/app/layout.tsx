// src/app/layout.tsx

import Nav from '@/components/Nav'
import './globals.css'
import { ReactNode } from 'react'
import Nav from '@/components/Nav'

 export const metadata = {
   title: 'EESYAI',
   description: 'Your AI chatbot',
 }
export const metadata = {
  title: 'EESYAI',
  description: 'Your AI chatbot',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
   return (
    <html lang="en">
      <body className="antialiased">
        <Nav />
        {children}
      </body>
    </html>
  )
}

