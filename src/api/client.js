// Fake API client — simulates network latency so loading states are real.
const LATENCY = 400 // ms per request

export function fakeGet(resolver) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(resolver()), LATENCY + Math.random() * 200)
  })
}
