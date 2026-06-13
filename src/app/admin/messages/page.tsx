import { redirect } from 'next/navigation'

export default function AdminMessagesPage() {
  redirect('/admin/enquiries?tab=messages')
}
