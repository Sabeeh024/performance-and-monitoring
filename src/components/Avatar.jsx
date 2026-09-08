// No width/height attributes on purpose — revisited in the layout-stability topic.
export function Avatar({ user, size = 32 }) {
  return (
    <img
      className="avatar"
      src={user.avatar}
      alt={user.name}
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  )
}
