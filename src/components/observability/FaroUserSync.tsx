'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getFaro } from '@/lib/faro'

export default function FaroUserSync() {
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const faro = getFaro()
        if (!faro) return

        if (!session?.user) {
          faro.api.resetUser()
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        faro.api.setUser({
          id: session.user.id,
          attributes: {
            role: profile?.is_admin ? 'admin' : 'member',
          },
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return null
}
