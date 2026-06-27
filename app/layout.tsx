import type { Metadata } from 'next'
import '/globals.css'

export const metadata: Metadata = {
  title: '직원 출퇴근 관리',
  description: '직원 출퇴근 체크 및 요청사항 관리 시스템',
  manifest: '/manifest.json',
  themeColor: '#1d4ed8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) 
{
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
    )
}

import type { Metadata } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/common/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: '직원 출퇴근 관리',
  description: '직원 출퇴근 체크 및 요청사항 관리 시스템',
  manifest: '/manifest.json',
  themeColor: '#1d4ed8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}