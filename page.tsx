import Chat from './components/Chat'
import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Manual de Convivencia Chat',
  description: 'Chat interactivo para consultas sobre el manual de convivencia',
}

export default function Page() {
  return <Chat />
}

