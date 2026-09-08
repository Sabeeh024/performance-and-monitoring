import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    login(name.trim() || 'Guest')
    navigate('/')
  }

  return (
    <form className="login" onSubmit={handleSubmit}>
      <h1>Log in</h1>
      <p className="muted">Mock login — any name works.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoFocus
      />
      <button type="submit">Continue</button>
    </form>
  )
}
