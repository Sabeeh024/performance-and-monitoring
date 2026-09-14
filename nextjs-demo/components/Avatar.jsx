import Image from 'next/image'

// next/image vs the Vite app's lib/img.js: there we hand-built srcset strings
// and picked widths ourselves. Here, `sizes` + the intrinsic width/height are
// enough - Next generates the srcset, picks the right format per browser via
// the Accept header (real content negotiation, not a `.webp` suffix trick),
// and serves it through its own image-optimization endpoint.
export function Avatar({ user, size = 32 }) {
  return (
    <Image
      className="avatar"
      src={user.avatar}
      alt={user.name}
      width={size}
      height={size}
    />
  )
}
