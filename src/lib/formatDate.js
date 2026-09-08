import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (iso) => format(new Date(iso), 'MMM d, yyyy')

export const formatRelative = (iso) =>
  formatDistanceToNow(new Date(iso), { addSuffix: true })
