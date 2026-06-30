import logo from './logo.png'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabase'

export default function Register() {
  const [f, setF] = useState({ email: '', meno: '', priezvisko: '', datum: '', heslo: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (f.heslo.length < 6) return setErr('Heslo musí mať aspoň 6 znakov.')
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email: f.email,
      password: f.heslo,
      options: { data: { meno: f.meno, priezvisko: f.priezvisko, datum_narodenia: f.datum } },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setOk(true)
  }

  if (ok)
    return (
      <div className="authwrap">
        <div className="card authcard">
          <div className="logo">✅</div>
          <h1>Hotovo</h1>
          <p className="muted">Účet je vytvorený. Teraz sa môžeš prihlásiť.</p>
          <button className="btn" onClick={() => nav('/login')}>Prejsť na prihlásenie</button>
        </div>
      </div>
    )

  return (
    <div className="authwrap">
      <form className="card authcard" onSubmit={submit}>
        <img src={logo} alt="TDtopspin" className="logo-img" />
        <h1>Registrácia</h1>
        <input className="inp" type="email" placeholder="E-mail" value={f.email} onChange={set('email')} required />
        <input className="inp" placeholder="Meno" value={f.meno} onChange={set('meno')} required />
        <input className="inp" placeholder="Priezvisko" value={f.priezvisko} onChange={set('priezvisko')} required />
        <label className="lbl-s">Dátum narodenia</label>
        <input className="inp" type="date" value={f.datum} onChange={set('datum')} />
        <input className="inp" type="password" placeholder="Heslo (min. 6 znakov)" value={f.heslo} onChange={set('heslo')} required />
        {err && <div className="msg">{err}</div>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Registrujem…' : 'Zaregistrovať'}</button>
        <div className="muted small"><Link to="/login">Späť na prihlásenie</Link></div>
      </form>
    </div>
  )
}
