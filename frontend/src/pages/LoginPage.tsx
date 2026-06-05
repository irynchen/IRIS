import React, { useState } from 'react'
import api from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function LoginPage(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try{
      const res = await api.post('/auth/login', { username, password })
      const token = res.data.access_token
      window.localStorage.setItem('iris_token', token)
      navigate('/')
    }catch(err){
      alert('Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <form onSubmit={submit} className="p-6 bg-white rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl mb-4">IRIS</h1>
        <input className="w-full p-2 border rounded mb-2" placeholder="Benutzer" value={username} onChange={e=>setUsername(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded mb-4" placeholder="Passwort" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full p-2 bg-[var(--color-primary)] text-white rounded">Einloggen</button>
      </form>
    </div>
  )
}
