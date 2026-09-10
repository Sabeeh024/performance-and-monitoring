import { memo } from 'react'
import { avatar } from '../lib/img'

// width/height are real attributes, not just CSS — they give the browser the
// aspect ratio before the file loads, so the row doesn't reflow (topic 05).
export const Avatar = memo(function Avatar({ user, size = 32 }) {
  const img = avatar(user.avatar, size)
  return (
    <img
      className="avatar"
      src={img.src}
      srcSet={img.srcSet}
      width={img.width}
      height={img.height}
      alt={user.name}
      loading="lazy"
      decoding="async"
    />
  )
})
