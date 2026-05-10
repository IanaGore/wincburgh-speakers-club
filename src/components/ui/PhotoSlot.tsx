import { createClient } from '@/utils/supabase/server'
import './PhotoSlot.css'

interface PhotoSlotProps {
  width?: number | string
  height?: number | string
  label?: string
  className?: string
  style?: React.CSSProperties
  mediaKey?: string
}

export default async function PhotoSlot({
  width = '100%',
  height = 200,
  label = 'photo',
  className = '',
  style,
  mediaKey,
}: PhotoSlotProps) {
  if (mediaKey) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('media')
      .select('storage_path, alt_text')
      .eq('key', mediaKey)
      .single()

    if (data) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media/${data.storage_path}`
      return (
        <div className={`photo-slot ${className}`} style={{ width, height, ...style }}>
          <img
            src={url}
            alt={data.alt_text ?? label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )
    }
  }

  return (
    <div
      className={`photo-slot ${className}`}
      style={{ width, height, ...style }}
    >
      <span className="photo-slot__label">{label}</span>
    </div>
  )
}
