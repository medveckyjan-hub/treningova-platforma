import logo from './logo.png'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [heslo, setHeslo] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: heslo })
    setBusy(false)
    if (error) setErr('Nesprávny e-mail alebo heslo.')
    else nav('/')
  }

  const reset = async () => {
    if (!email) return setErr('Najprv zadaj e-mail.')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setErr(error ? 'Reset sa nepodaril.' : 'Poslali sme e-mail na obnovu hesla.')
  }

  return (
    <div className="authwrap">
      <form className="card authcard" onSubmit={submit}>
        <img src={logo} alt="TDtopspin" className="logo-img" />
        <h1>TDtopspin</h1>
        <p className="muted">Prihlásenie</p>
        <input className="inp" type="email" placeholder="E-mail" value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input className="inp" type="password" placeholder="Heslo" value={heslo}
          onChange={(e) => setHeslo(e.target.value)} autoComplete="current-password" required />
        {err && <div className="msg">{err}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Prihlasujem…' : 'Prihlásiť sa'}
        </button>
        <button type="button" className="btn-link" onClick={reset}>Zabudnuté heslo</button>
        <div className="muted small">
          Máš pozvánku? <Link to="/register">Dokončiť registráciu</Link>
        </div>
      </form>
    </div>
  )
}
