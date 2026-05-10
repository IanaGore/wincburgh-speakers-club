'use server'

export async function sendContactMessage(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const topic = formData.get('topic') as string
  const message = formData.get('message') as string
  const smsOk = formData.get('sms_ok') === 'on'

  console.log('[Contact] New message:', { name, email, topic, message, smsOk })

  return { success: true, error: null }
}
