import { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Ingresar | Consignatarias.com.ar',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginClient />
}
