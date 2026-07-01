import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAthlete, AthletePicker } from './AthleteContext'
import { useAuth } from './AuthContext'
import av1 from './av1.png'
import av2 from './av2.png'
import av3 from './av3.png'
import av4 from './av4.png'
import av5 from './av5.png'
import av6 from './av6.png'
import av7 from './av7.png'
import av8 from './av8.png'
import av9 from './av9.png'
import av10 from './av10.png'
import av11 from './av11.png'
import av12 from './av12.png'
import av13 from './av13.png'
import av14 from './av14.png'
import av15 from './av15.png'
const PRESET_IMAGES = [av1, av2, av3, av4, av5, av6, av7, av8, av9, av10, av11, av12, av13, av14, av15]

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

const MATERIAL_FIELDS = [
  ['drevo_znacka', 'Drevo – značka', 'text'],
  ['drevo_typ', 'Drevo – typ/druh (napr. OFF, ALL, karbón)', 'text'],
  ['potah_fh', 'Forhend – poťah (typ)', 'text'],
  ['potah_fh_hrubka', 'Forhend – hrúbka', 'text'],
  ['potah_fh_farba', 'Forhend – farba', 'text'],
  ['potah_bh', 'Bekhend – poťah (typ)', 'text'],
  ['potah_bh_hrubka', 'Bekhend – hrúbka', 'text'],
  ['potah_bh_farba', 'Bekhend – farba', 'text'],
]
const INFO_FIELDS = [
  ['bydlisko', 'Bydlisko', 'text'],
  ['mobil', 'Mobil', 'tel'],
  ['vyska_cm', 'Výška (cm)', 'number'],
  ['vaha_kg', 'Váha (kg)', 'number'],
  ['hracia_ruka', 'Hracia ruka', 'text'],
  ['ponatie', 'Poňatie hry', 'text'],
  ['treningovy_klub', 'Tréningový klub', 'text'],
  ['zaciatok_kariery', 'Začiatok kariéry (rok)', 'number'],
  ['trener_meno', 'Tréner', 'text'],
  ['trener_email', 'E-mail trénera', 'email'],
]
const AP_FIELDS = [...MATERIAL_FIELDS, ...INFO_FIELDS]
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
    const src = PRESET_IMAGES[(n - 1) % PRESET_IMAGES.length]
    return <img className="avatar" src={src} style={{ width: size, height: size, objectFit: 'cover' }} alt="" />
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
        {[['udaje', 'Údaje'], ['avatar', 'Avatar'], ['testy', 'Testy'], ['ciele', 'Ciele'], ['zdravie', 'Zdravie']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')} style={tab === k ? { background: 'rgba(122,162,255,0.18)', color: ACCENT } : undefined} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'udaje' && <UdajeView aid={aid} email={selectedAthlete?.email} />}
      {tab === 'avatar' && <AvatarPicker aid={aid} meno={meno} />}
      {tab === 'testy' && <TestyView aid={aid} />}
      {tab === 'ciele' && <CieleView aid={aid} />}
      {tab === 'zdravie' && <ZdravieView aid={aid} />}
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
        <div className="sk-h">Výstroj / materiál</div>
        {MATERIAL_FIELDS.map(([k, l, type]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div className="lbl-s">{l}</div>
            <input className="inp" type={type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
              value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="card sk-card">
        <div className="sk-h">Hráčske údaje</div>
        {INFO_FIELDS.map(([k, l, type]) => (
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
          {PRESET_IMAGES.map((c, i) => (
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


// ---------- ZDRAVIE ----------
function ZdravieView({ aid }) {
  const [obmedzenia, setObmedzenia] = useState('')
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingO, setSavingO] = useState(false)
  const [msgO, setMsgO] = useState('')
  const [d, setD] = useState('')
  const [pozn, setPozn] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: ap } = await supabase.from('athlete_profile').select('zdravotne_obmedzenia').eq('profile_id', aid).maybeSingle()
      const { data: ex } = await supabase.from('medical_exams').select('*').eq('athlete_id', aid).order('d', { ascending: false })
      if (!alive) return
      setObmedzenia(ap?.zdravotne_obmedzenia || '')
      setExams(ex || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [aid])

  const saveObmedzenia = async () => {
    setSavingO(true); setMsgO('')
    const { error } = await supabase.from('athlete_profile').upsert({ profile_id: aid, zdravotne_obmedzenia: obmedzenia || null })
    setSavingO(false); setMsgO(error ? 'Chyba' : 'Uložené ✓'); setTimeout(() => setMsgO(''), 1600)
  }

  const addExam = async () => {
    setErr('')
    if (!file) { setErr('Vyber PDF súbor.'); return }
    setUploading(true)
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${aid}/${Date.now()}_${safe}`
    const { error: upErr } = await supabase.storage.from('lekarske').upload(path, file)
    if (upErr) { setErr('Nahrávanie zlyhalo: ' + upErr.message); setUploading(false); return }
    const { data, error } = await supabase.from('medical_exams').insert({ athlete_id: aid, d: d || null, poznamka: pozn || null, file_path: path, file_name: file.name }).select('*').single()
    setUploading(false)
    if (error) { setErr('Uloženie záznamu zlyhalo.'); return }
    setExams((e) => [data, ...e]); setD(''); setPozn(''); setFile(null)
  }

  const openExam = async (ex) => {
    if (!ex.file_path) return
    const { data } = await supabase.storage.from('lekarske').createSignedUrl(ex.file_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }
  const delExam = async (ex) => {
    if (ex.file_path) await supabase.storage.from('lekarske').remove([ex.file_path])
    await supabase.from('medical_exams').delete().eq('id', ex.id)
    setExams((e) => e.filter((x) => x.id !== ex.id))
  }
  const fmtD = (s) => { if (!s) return ''; const [y, m, dd] = s.split('-'); return `${+dd}.${+m}.${y}` }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="card sk-card">
        <div className="sk-h">Zdravotné obmedzenia</div>
        <textarea className="ta" rows={3} value={obmedzenia} onChange={(e) => setObmedzenia(e.target.value)} placeholder="alergie, zranenia, obmedzenia…" />
        {msgO && <div className="okmsg">{msgO}</div>}
        <button className="btn" style={{ marginTop: 10 }} onClick={saveObmedzenia} disabled={savingO}>{savingO ? 'Ukladám…' : 'Uložiť'}</button>
      </div>

      <div className="card sk-card">
        <div className="sk-h">Lekárska prehliadka (telovýchovné lekárstvo)</div>
        <div className="muted small" style={{ marginBottom: 10 }}>Absolvuje sa každý rok. Pridaj dátum a nahraj PDF výsledok.</div>
        <div className="lbl-s">Dátum prehliadky</div>
        <input className="inp" type="date" value={d} onChange={(e) => setD(e.target.value)} />
        <div className="lbl-s" style={{ marginTop: 8 }}>Poznámka</div>
        <input className="inp" value={pozn} onChange={(e) => setPozn(e.target.value)} />
        <div className="lbl-s" style={{ marginTop: 8 }}>PDF príloha</div>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {err && <div className="msg" style={{ marginTop: 8 }}>{err}</div>}
        <button className="btn" style={{ marginTop: 10 }} onClick={addExam} disabled={uploading}>{uploading ? 'Nahrávam…' : 'Pridať prehliadku'}</button>
      </div>

      {exams.length === 0 ? <div className="muted" style={{ padding: 8 }}>Zatiaľ žiadne prehliadky.</div> : exams.map((ex) => (
        <div key={ex.id} className="card sk-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>{fmtD(ex.d) || 'bez dátumu'}</div>
              {ex.poznamka && <div className="muted small">{ex.poznamka}</div>}
              {ex.file_name && <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.file_name}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {ex.file_path && <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => openExam(ex)}>PDF</button>}
              <button className="del" onClick={() => delExam(ex)}>Zmazať</button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}


// ---------- CIELE ----------
function CieleView({ aid }) {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', popis: '', target: '', deadline: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!aid) return
    supabase.from('goals').select('*').eq('athlete_id', aid).order('done').order('deadline', { nullsFirst: false })
      .then(({ data }) => { setGoals(data || []); setLoading(false) })
  }, [aid])

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const add = async () => {
    if (!f.title.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('goals').insert({
      athlete_id: aid, title: f.title, popis: f.popis || null, target: f.target || null,
      deadline: f.deadline || null, created_by: user?.id,
    }).select('*').single()
    setSaving(false)
    if (!error) { setGoals((g) => [data, ...g]); setF({ title: '', popis: '', target: '', deadline: '' }); setOpen(false) }
  }
  const toggle = async (g) => { await supabase.from('goals').update({ done: !g.done }).eq('id', g.id); setGoals((gs) => gs.map((x) => x.id === g.id ? { ...x, done: !x.done } : x)) }
  const del = async (id) => { await supabase.from('goals').delete().eq('id', id); setGoals((gs) => gs.filter((x) => x.id !== id)) }
  const fmtD = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${+d}.${+m}.${y}` }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <button className="btn" style={{ marginBottom: 12 }} onClick={() => setOpen((o) => !o)}>{open ? 'Zrušiť' : '+ Pridať cieľ'}</button>
      {open && (
        <div className="card sk-card">
          <div className="lbl-s">Cieľ</div>
          <input className="inp" placeholder="napr. Zlepšiť bekhend topspin" value={f.title} onChange={(e) => set('title', e.target.value)} />
          <div className="lbl-s" style={{ marginTop: 8 }}>Popis</div>
          <textarea className="ta" rows={2} value={f.popis} onChange={(e) => set('popis', e.target.value)} />
          <div className="row2" style={{ marginTop: 8 }}>
            <div className="numbox"><label className="lbl-s">Cieľová hodnota</label><input className="inp" placeholder="napr. 40 h/mes." value={f.target} onChange={(e) => set('target', e.target.value)} /></div>
            <div className="numbox"><label className="lbl-s">Termín</label><input className="inp" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} /></div>
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={add} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť cieľ'}</button>
        </div>
      )}
      {goals.length === 0 && <div className="muted" style={{ padding: 8 }}>Zatiaľ žiadne ciele.</div>}
      {goals.map((g) => (
        <div key={g.id} className="card sk-card" style={{ opacity: g.done ? 0.6 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, textDecoration: g.done ? 'line-through' : 'none' }}>{g.title}</div>
              {g.popis && <div className="muted small">{g.popis}</div>}
              <div className="res-meta">
                {g.target && <span className="res-badge">{g.target}</span>}
                {g.deadline && <span>do {fmtD(g.deadline)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => toggle(g)}>{g.done ? '↩' : '✓'}</button>
              <button className="del" onClick={() => del(g.id)}>Zmazať</button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
