import { redirect } from 'next/navigation'

export default function ContactPage() {
  redirect('/get-started?intent=ask')
}
