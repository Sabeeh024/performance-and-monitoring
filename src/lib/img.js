// Image-URL helpers. picsum.photos acts as our image CDN: it resizes to the
// dimensions in the path and returns WebP when the extension asks for it.
// A production CDN (Cloudinary, imgix, Vercel/Netlify Image, weserv) would also
// negotiate AVIF via the Accept header and take a quality param — same idea.

const COVER_RATIO = 630 / 1200 // 1.905:1

const coverUrl = (seed, w) =>
  `https://picsum.photos/seed/${seed}/${w}/${Math.round(w * COVER_RATIO)}.webp`

// `sizes` tells the browser how wide the image renders so it can pick from
// `srcset` *before* layout. Get this wrong and srcset is decorative.
export function cover(seed, { sizes, widths = [320, 480, 640, 800, 1200] } = {}) {
  return {
    src: coverUrl(seed, 800),
    srcSet: widths.map((w) => `${coverUrl(seed, w)} ${w}w`).join(', '),
    sizes,
    width: 1200,
    height: 630,
  }
}

// Avatars: fixed small box, but retina screens want 2x. One extra descriptor.
export function avatar(url, size) {
  const at = (dpr) => url.replace(/\/\d+/, `/${size * dpr}`)
  return {
    src: at(1),
    srcSet: `${at(1)} 1x, ${at(2)} 2x`,
    width: size,
    height: size,
  }
}
