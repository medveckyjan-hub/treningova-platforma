import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const ACCENT = '#38bdf8'
const ACTIVITIES = ['Tréning', 'Regenerácia', 'Masáž', 'Kondícia', 'Servis', 'Príjem', 'Fyzio', 'Individuál', 'Videoanalýza']
const TEMPLATES = {
  bezne: ['Rozcvička / Raňajky', 'Doobedný tréning', 'Obed', 'Poobedný tréning', 'Večera', 'Večerný program', 'Večierka'],
  kondicne: ['Warm up / beh', 'Raňajky', 'Doobedný blok', 'Obed', 'Poobedný blok', 'Večera', 'Regenerácia / masáž'],
}
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const WD = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']
const fmtD = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${+d}.${+m}.${y}` }
const fmtDM = (s) => { const [, m, d] = s.split('-'); return `${+d}.${+m}.` }
function rangeDates(from, to) {
  if (!from || !to) return []
  const out = []; const a = new Date(from); const b = new Date(to)
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  return out.slice(0, 21)
}

export default function Sustredenie() {
  const { user } = useAuth()
  const [view, setView] = useState('list')
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('camps').select('*').order('date_from', { ascending: false })
    setCamps(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async (name, from, to, template) => {
    const { data } = await supabase.from('camps').insert({
      owner_id: user.id, name, date_from: from, date_to: to, template,
      rows: TEMPLATES[template] || TEMPLATES.bezne, cells: {},
    }).select('*').single()
    if (data) { setSel(data); setView('edit'); load() }
  }

  if (view === 'edit' && sel) return <CampEdit camp={sel} onBack={() => { setView('list'); load() }} />
  return <CampList camps={camps} loading={loading} onNew={create} onOpen={(c) => { setSel(c); setView('edit') }} onReload={load} />
}

function CampList({ camps, loading, onNew, onOpen, onReload }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())
  const [template, setTemplate] = useState('bezne')

  const del = async (id) => { await supabase.from('camps').delete().eq('id', id); onReload() }

  return (
    <>
      <button className="btn" style={{ marginBottom: 12 }} onClick={() => setOpen((o) => !o)}>{open ? 'Zrušiť' : '+ Nový plán sústredenia'}</button>
      {open && (
        <div className="card sk-card">
          <div className="lbl-s">Názov</div>
          <input className="inp" placeholder="napr. Sústredenie Havířov" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="row2" style={{ marginTop: 8 }}>
            <div className="numbox"><label className="lbl-s">Od</label><input className="inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="numbox"><label className="lbl-s">Do</label><input className="inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="lbl-s" style={{ marginTop: 8 }}>Typ sústredenia</div>
          <div className="flags">
            <button className={'flag' + (template === 'bezne' ? ' on' : '')} onClick={() => setTemplate('bezne')}>Bežné</button>
            <button className={'flag' + (template === 'kondicne' ? ' on' : '')} onClick={() => setTemplate('kondicne')}>Kondičné</button>
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => name && onNew(name, from, to, template)}>Vytvoriť a upraviť</button>
        </div>
      )}
      {loading ? <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div> : camps.length === 0 ? (
        <div className="muted" style={{ padding: 8 }}>Zatiaľ žiadne plány sústredení.</div>
      ) : camps.map((c) => (
        <div key={c.id} className="card sk-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <button style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--txt)', minWidth: 0 }} onClick={() => onOpen(c)}>
              <div style={{ fontWeight: 800 }}>{c.name || 'Bez názvu'}</div>
              <div className="muted small">{fmtD(c.date_from)} – {fmtD(c.date_to)} · {c.template === 'kondicne' ? 'Kondičné' : 'Bežné'}</div>
            </button>
            <button className="del" onClick={() => del(c.id)}>Zmazať</button>
          </div>
        </div>
      ))}
    </>
  )
}

function CampEdit({ camp, onBack }) {
  const [name, setName] = useState(camp.name || '')
  const [from, setFrom] = useState(camp.date_from || todayStr())
  const [to, setTo] = useState(camp.date_to || todayStr())
  const [rows, setRows] = useState(camp.rows || [])
  const [cells, setCells] = useState(camp.cells || {})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [focused, setFocused] = useState(null)
  const dates = rangeDates(from, to)

  const setCell = (ri, date, v) => setCells((c) => ({ ...c, [`${ri}_${date}`]: v }))
  const setRow = (ri, v) => setRows((r) => r.map((x, i) => (i === ri ? v : x)))
  const addRow = () => setRows((r) => [...r, 'Nový blok'])
  const removeRow = (ri) => setRows((r) => r.filter((_, i) => i !== ri))
  const insertActivity = (act) => {
    if (!focused) return
    setCells((c) => ({ ...c, [focused]: ((c[focused] || '') + (c[focused] ? ', ' : '') + act) }))
  }

  const save = async () => {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('camps').update({ name, date_from: from, date_to: to, rows, cells }).eq('id', camp.id)
    setSaving(false); setMsg(error ? 'Chyba' : 'Uložené ✓'); setTimeout(() => setMsg(''), 1600)
  }

  return (
    <>
      <button className="btn-ghost no-print" style={{ marginBottom: 12 }} onClick={onBack}>‹ Späť na zoznam</button>

      <div className="card sk-card no-print">
        <div className="lbl-s">Názov</div>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="row2" style={{ marginTop: 8 }}>
          <div className="numbox"><label className="lbl-s">Od</label><input className="inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="numbox"><label className="lbl-s">Do</label><input className="inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </div>

      <div className="card sk-card no-print">
        <div className="sk-h">Riadky (bloky dňa)</div>
        {rows.map((r, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="inp" value={r} onChange={(e) => setRow(ri, e.target.value)} />
            <button className="del" onClick={() => removeRow(ri)}>×</button>
          </div>
        ))}
        <button className="btn-ghost" onClick={addRow}>+ Pridať blok</button>
      </div>

      <div className="card sk-card no-print">
        <div className="sk-h">Rýchle činnosti (vlož do označeného políčka)</div>
        <div className="flags">
          {ACTIVITIES.map((a) => <button key={a} className="flag" onClick={() => insertActivity(a)}>{a}</button>)}
        </div>
      </div>

      {/* EDITOR – po dňoch (mobil) */}
      <div className="screen-only">
        {dates.map((date) => (
          <div key={date} className="card sk-card">
            <div style={{ fontWeight: 800, marginBottom: 8, color: ACCENT }}>{WD[new Date(date).getDay()]} {fmtD(date)}</div>
            {rows.map((r, ri) => (
              <div key={ri} style={{ marginBottom: 8 }}>
                <div className="lbl-s">{r}</div>
                <textarea className="ta" rows={2} value={cells[`${ri}_${date}`] || ''}
                  onFocus={() => setFocused(`${ri}_${date}`)}
                  onChange={(e) => setCell(ri, date, e.target.value)}
                  placeholder="činnosť + čas, napr. Stolný tenis 9:00–10:30" />
              </div>
            ))}
          </div>
        ))}
        {msg && <div className="okmsg">{msg}</div>}
        <button className="btn" style={{ marginTop: 8 }} onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť plán'}</button>
        <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => window.print()}>🖨 Tlačiť plán (A4)</button>
      </div>

      {/* TLAČ – mriežka */}
      <div className="print-only">
        <div className="print-head">
          <h2 style={{ margin: '0 0 2px' }}>{name}</h2>
          <div>{fmtD(from)} – {fmtD(to)}</div>
        </div>
        <table className="vtable camptable">
          <thead>
            <tr><th></th>{dates.map((d) => <th key={d}>{WD[new Date(d).getDay()]} {fmtDM(d)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <th style={{ textAlign: 'left', background: '#eef2f6' }}>{r}</th>
                {dates.map((d) => <td key={d}>{cells[`${ri}_${d}`] || ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
