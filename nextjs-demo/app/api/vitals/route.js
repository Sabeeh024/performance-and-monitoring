// The Vite SPA's sendBeacon target didn't exist - a real 404 (topic 08).
// Here it can, trivially, because Next is a server, not just a static bundle:
// a route handler is a real endpoint, not a simulation. Not a rendering-
// strategy point, just worth naming as a difference in what's "free."
export async function POST(request) {
  const metric = await request.json()
  console.log('[vitals]', metric.name, Math.round(metric.value), metric.rating)
  return new Response(null, { status: 204 })
}
