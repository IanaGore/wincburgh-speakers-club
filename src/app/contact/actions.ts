'use server'

// TODO: Replace console.log with email send (Resend/Edge Function) before launch
export async function sendContactMessage(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string | null
  const topic = formData.get('topic') as string
  const message = formData.get('message') as string
  const smsOk = formData.get('sms_ok') === 'on'

  console.log('Contact form submission:', { name, email, phone, topic, message, smsOk })

  return { success: true, error: null }
}
