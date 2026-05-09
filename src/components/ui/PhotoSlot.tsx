import './PhotoSlot.css'

interface PhotoSlotProps {
  width?: number | string
  height?: number | string
  label?: string
  className?: string
  style?: React.CSSProperties
}

export default function PhotoSlot({
  width = '100%',
  height = 200,
  label = 'photo',
  className = '',
  style,
}: PhotoSlotProps) {
  return (
    <div
      className={`photo-slot ${className}`}
      style={{ width, height, ...style }}
    >
      <span className="photo-slot__label">{label}</span>
    </div>
  )
}
