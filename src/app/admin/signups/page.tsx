import { redirect } from 'next/navigation'

export default function AdminSignupsPage() {
  redirect('/admin/enquiries?tab=rsvps')
}
