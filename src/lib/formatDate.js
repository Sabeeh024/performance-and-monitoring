// Was: date-fns `format` + `formatDistanceToNow` (~15 KB gzip in the bundle).
// Now: the platform's Intl APIs — zero dependency, and the formatter objects are
// created once at module load rather than per call.
const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export const formatDate = (iso) => dateFmt.format(new Date(iso))

const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

export function formatRelative(iso) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  for (const [unit, secs] of UNITS) {
    if (Math.abs(seconds) >= secs || unit === 'second') {
      return rtf.format(Math.round(-seconds / secs), unit)
    }
  }
}
