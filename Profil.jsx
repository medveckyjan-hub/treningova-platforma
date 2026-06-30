import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAthlete, AthletePicker } from './AthleteContext'

const ACCENT = '#7aa2ff'
const PRESET_GRADIENTS = [
  ['#ff6b6b', '#ee5253'], ['#feca57', '#ff9f43'], ['#1dd1a1', '#10ac84'],
  ['#54a0ff', '#2e86de'], ['#5f27cd', '#341f97'], ['#48dbfb', '#0abde3'],
  ['#ff9ff3', '#f368e0'], ['#00d2d3', '#01a3a4'], ['#778ca3', '#4b6584'], ['#c8d6e5', '#8395a7'],
]
function initials(name) {
  if (!name) return ''
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase()
}

const AP_FIELDS = [
  ['bydlisko', 'Bydlisko', 'text'],
  ['mobil', 'Mobil', 'tel'],
  ['vyska_cm', 'Výška (cm)', 'number'],
  ['vaha_kg', 'Váha (kg)', 'number'],
  ['hracia_ruka', 'Hracia ruka', 'text'],
  ['ponatie', 'Poňatie hry', 'text'],
  ['drevo_znacka', 'Drevo (značka)', 'text'],
  ['potahy', 'Poťahy', 'text'],
  ['treningovy_klub', 'Tréningový klub', 'text'],
  ['zaciatok_kariery', 'Začiatok kariéry (rok)', 'number'],
  ['trener_meno', 'Tréner', 'text'],
  ['trener_email', 'E-mail trénera', 'email'],
]
const TEST_FIELDS = [
  ['vyska', 'Výška (cm)'], ['vaha', 'Váha (kg)'], ['beh', 'Beh (s)'],
  ['skok', 'Skok do diaľky (cm)'], ['medicimbal', 'Medicimbal 2kg (m)'],
  ['sed_lah', 'Sed-ľah (60s)'], ['predklon', 'Predklon (cm)'],
  ['beep', 'Beep test'], ['beh12', 'Beh 12 min (m)'],
]

export function AvatarView({ avatar, name, size = 88 }) {
  const ini = initials(name)
  if (avatar && avatar.startsWith('preset:')) {
    const n = +avatar.split(':')[1] || 1
    const [a, b] = PRESET_GRADIENTS[(n - 1) % PRESET_GRADIENTS.length]
    return (
      <div className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})`, color: '#fff', fontWeight: 800, fontSize: size * 0.38 }}>{ini}</div>
    )
  }
  if (avatar) return <img className="avatar" src={avatar} style={{ width: size, height: size, objectFit: 'cover' }} alt="" />
  return (
    <div className="avatar" style={{ width: size, height: size, background: 'linear-gradient(135deg, #54a0ff, #2e86de)', color: '#fff', fontWeight: 800, fontSize: size * 0.38 }}>{ini || '?'}</div>
  )
}

export default function Profil() {
  const { selectedId, selectedAthlete } = useAthlete()
  const aid = selectedId
  const meno = `${selectedAthlete?.meno || ''} ${selectedAthlete?.priezvisko || ''}`.trim()
  const [tab, setTab] = useState('udaje')

  return (
    <div className="page">
      <h2 className="page-title" style={{ color: ACCENT }}>Profil</h2>
      <AthletePicker />
      <div className="seg">
        {[['udaje', 'Údaje'], ['avatar', 'Avatar'], ['testy', 'Testy']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')} style={tab === k ? { background: 'rgba(122,162,255,0.18)', color: ACCENT } : undefined} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'udaje' && <UdajeView aid={aid} email={selectedAthlete?.email} />}
      {tab === 'avatar' && <AvatarPicker aid={aid} meno={meno} />}
      {tab === 'testy' && <TestyView aid={aid} />}
    </div>
  )
}

// ---------- ÚDAJE ----------
function UdajeView({ aid, email }) {
  const [f, setF] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', aid).maybeSingle()
      const { data: ap } = await supabase.from('athlete_profile').select('*').eq('profile_id', aid).maybeSingle()
      if (!alive) return
      const b = { meno: p?.meno || '', priezvisko: p?.priezvisko || '', datum_narodenia: p?.datum_narodenia || '' }
      AP_FIELDS.forEach(([k]) => (b[k] = ap?.[k] ?? ''))
      setF(b); setLoading(false)
    })()
    return () => { alive = false }
  }, [aid])

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const save = async () => {
    setSaving(true); setMsg('')
    await supabase.from('profiles').update({
      meno: f.meno || null, priezvisko: f.priezvisko || null, datum_narodenia: f.datum_narodenia || null,
    }).eq('id', aid)
    const ap = { profile_id: aid }
    AP_FIELDS.forEach(([k, , type]) => { ap[k] = f[k] === '' ? null : (type === 'number' ? +f[k] : f[k]) })
    const { error } = await supabase.from('athlete_profile').upsert(ap)
    setSaving(false)
    setMsg(error ? 'Chyba pri ukladaní' : 'Uložené ✓')
    setTimeout(() => setMsg(''), 1800)
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="card sk-card">
        <div className="lbl-s">Meno</div>
        <input className="inp" value={f.meno} onChange={(e) => set('meno', e.target.value)} />
        <div className="lbl-s" style={{ marginTop: 8 }}>Priezvisko</div>
        <input className="inp" value={f.priezvisko} onChange={(e) => set('priezvisko', e.target.value)} />
        <div className="lbl-s" style={{ marginTop: 8 }}>Dátum narodenia</div>
        <input className="inp" type="date" value={f.datum_narodenia || ''} onChange={(e) => set('datum_narodenia', e.target.value)} />
        <div className="lbl-s" style={{ marginTop: 8 }}>E-mail</div>
        <input className="inp" value={email || ''} disabled style={{ opacity: 0.6 }} />
      </div>
      <div className="card sk-card">
        <div className="sk-h">Hráčske údaje</div>
        {AP_FIELDS.map(([k, l, type]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div className="lbl-s">{l}</div>
            <input className="inp" type={type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
              value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      {msg && <div className="okmsg">{msg}</div>}
      <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť údaje'}</button>
    </>
  )
}

// ---------- AVATAR ----------
function AvatarPicker({ aid, meno }) {
  const [avatar, setAvatar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!aid) return
    supabase.from('profiles').select('avatar').eq('id', aid).maybeSingle()
      .then(({ data }) => { setAvatar(data?.avatar || null); setLoading(false) })
  }, [aid])

  const saveAvatar = async (val) => {
    setAvatar(val)
    const { error } = await supabase.from('profiles').update({ avatar: val }).eq('id', aid)
    setMsg(error ? 'Chyba' : 'Uložené ✓'); setTimeout(() => setMsg(''), 1500)
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const s = 200
        const c = document.createElement('canvas'); c.width = s; c.height = s
        const ctx = c.getContext('2d')
        const r = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - r) / 2, (img.height - r) / 2, r, r, 0, 0, s, s)
        saveAvatar(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="card sk-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <AvatarView avatar={avatar} name={meno} size={104} />
        </div>
        <label className="btn-ghost" style={{ display: 'inline-block', cursor: 'pointer' }}>
          Nahrať vlastný obrázok
          <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        </label>
      </div>
      <div className="card sk-card">
        <div className="sk-h">Alebo vyber z prednastavených</div>
        <div className="avgrid">
          {PRESET_GRADIENTS.map((c, i) => (
            <button key={i} className={'avopt' + (avatar === `preset:${i + 1}` ? ' on' : '')} onClick={() => saveAvatar(`preset:${i + 1}`)}>
              <AvatarView avatar={`preset:${i + 1}`} name={meno} size={54} />
            </button>
          ))}
        </div>
      </div>
      {msg && <div className="okmsg">{msg}</div>}
    </>
  )
}

// ---------- TESTY ----------
function TestyView({ aid }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ rok: new Date().getFullYear(), label: '', is_goal: false })
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!aid) return
    supabase.from('fitness_tests').select('*').eq('athlete_id', aid)
      .then(({ data }) => {
        setTests((data || []).sort((a, b) => (b.rok || 0) - (a.rok || 0) || (a.is_goal ? 1 : 0)))
        setLoading(false)
      })
  }, [aid])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const add = async () => {
    setSaving(true)
    const row = { athlete_id: aid, rok: +form.rok || null, label: form.label || null, is_goal: !!form.is_goal }
    TEST_FIELDS.forEach(([k]) => { if (form[k] !== '' && form[k] != null) row[k] = +form[k] })
    const { data, error } = await supabase.from('fitness_tests').insert(row).select('*').single()
    setSaving(false)
    if (!error) { setTests((t) => [data, ...t]); setForm({ rok: new Date().getFullYear(), label: '', is_goal: false }); setOpen(false) }
  }
  const del = async (id) => { await supabase.from('fitness_tests').delete().eq('id', id); setTests((t) => t.filter((x) => x.id !== id)) }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <button className="btn" style={{ marginBottom: 12 }} onClick={() => setOpen((o) => !o)}>
        {open ? 'Zrušiť' : '+ Pridať test'}
      </button>
      {open && (
        <div className="card sk-card">
          <div className="row2">
            <div className="numbox"><label className="lbl-s">Rok</label>
              <input className="inp" type="number" value={form.rok} onChange={(e) => set('rok', e.target.value)} /></div>
            <div className="numbox"><label className="lbl-s">Označenie</label>
              <input className="inp" placeholder="napr. 2026/1" value={form.label} onChange={(e) => set('label', e.target.value)} /></div>
          </div>
          <button className={'flag' + (form.is_goal ? ' on' : '')} style={{ margin: '10px 0' }} onClick={() => set('is_goal', !form.is_goal)}>
            {form.is_goal ? '✓ Cieľ' : 'Označiť ako cieľ'}
          </button>
          {TEST_FIELDS.map(([k, l]) => (
            <div key={k} className="numrow"><span>{l}</span>
              <input className="ninp" type="number" inputMode="decimal" value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></div>
          ))}
          <button className="btn" style={{ marginTop: 10 }} onClick={add} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť test'}</button>
        </div>
      )}
      {tests.length === 0 && <div className="muted" style={{ padding: 8 }}>Zatiaľ žiadne testy.</div>}
      {tests.map((t) => (
        <div key={t.id} className="card sk-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 800 }}>
              {t.label || t.rok} {t.is_goal && <span className="goaltag">cieľ</span>}
            </div>
            <button className="del" onClick={() => del(t.id)}>Zmazať</button>
          </div>
          <div className="testvals">
            {TEST_FIELDS.filter(([k]) => t[k] != null).map(([k, l]) => (
              <span key={k}>{l}: <b>{t[k]}</b></span>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
