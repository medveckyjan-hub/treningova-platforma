import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const ACCENT = '#f0b429'
const KATEGORIE = ['Liga', 'Extraliga', 'SP', 'MSR', 'ME', 'MS', 'WTT', 'iné']
const DISCIPLINY = [
  ['single', 'Dvojhra'], ['double', 'Štvorhra'], ['mix', 'Mix'], ['team', 'Družstvá'],
]
const todayStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const fmtD = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${+d}.${+m}.${y}` }
const discLabel = (v) => (DISCIPLINY.find((x) => x[0] === v)?.[1] || '')

export default function Vysledky() {
  const { user } = useAuth()
  const aid = user?.id
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ d: todayStr(), kategoria: 'Liga', disciplina: 'single', nazov_podujatia: '', umiestnenie: '', poznamka: '' })

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('results').select('*').eq('athlete_id', aid).order('d', { ascending: false })
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [aid])

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const add = async () => {
    setSaving(true)
    const row = {
      athlete_id: aid, d: f.d, kategoria: f.kategoria, disciplina: f.disciplina,
      nazov_podujatia: f.nazov_podujatia || null, umiestnenie: f.umiestnenie || null, poznamka: f.poznamka || null,
    }
    const { data, error } = await supabase.from('results').insert(row).select('*').single()
    setSaving(false)
    if (!error) {
      setRows((r) => [data, ...r].sort((a, b) => (b.d || '').localeCompare(a.d || '')))
      setF({ d: todayStr(), kategoria: 'Liga', disciplina: 'single', nazov_podujatia: '', umiestnenie: '', poznamka: '' })
      setOpen(false)
    }
  }
  const del = async (id) => { await supabase.from('results').delete().eq('id', id); setRows((r) => r.filter((x) => x.id !== id)) }

  return (
    <div className="page">
      <h2 className="page-title" style={{ color: ACCENT }}>Výsledky</h2>

      <button className="btn" style={{ marginBottom: 12, background: ACCENT, color: '#1a1407' }} onClick={() => setOpen((o) => !o)}>
        {open ? 'Zrušiť' : '+ Pridať výsledok'}
      </button>

      {open && (
        <div className="card sk-card">
          <div className="lbl-s">Dátum</div>
          <input className="inp" type="date" value={f.d} onChange={(e) => set('d', e.target.value)} />

          <div className="lbl-s" style={{ marginTop: 10 }}>Kategória</div>
          <div className="flags">
            {KATEGORIE.map((k) => (
              <button key={k} className={'flag' + (f.kategoria === k ? ' on' : '')} onClick={() => set('kategoria', k)}>{k}</button>
            ))}
          </div>

          <div className="lbl-s" style={{ marginTop: 10 }}>Disciplína</div>
          <div className="flags">
            {DISCIPLINY.map(([v, l]) => (
              <button key={v} className={'flag' + (f.disciplina === v ? ' on' : '')} onClick={() => set('disciplina', v)}>{l}</button>
            ))}
          </div>

          <div className="lbl-s" style={{ marginTop: 10 }}>Podujatie</div>
          <input className="inp" placeholder="napr. Extraliga – 7. kolo" value={f.nazov_podujatia} onChange={(e) => set('nazov_podujatia', e.target.value)} />

          <div className="lbl-s" style={{ marginTop: 10 }}>Umiestnenie / výsledok</div>
          <input className="inp" placeholder="napr. 1. miesto, štvrťfinále, 3:1" value={f.umiestnenie} onChange={(e) => set('umiestnenie', e.target.value)} />

          <div className="lbl-s" style={{ marginTop: 10 }}>Poznámka</div>
          <input className="inp" value={f.poznamka} onChange={(e) => set('poznamka', e.target.value)} />

          <button className="btn" style={{ marginTop: 12, background: ACCENT, color: '#1a1407' }} onClick={add} disabled={saving}>
            {saving ? 'Ukladám…' : 'Uložiť výsledok'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ padding: 8 }}>Zatiaľ žiadne výsledky.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card sk-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{r.nazov_podujatia || r.kategoria}</div>
                <div className="res-meta">
                  <span className="res-badge">{r.kategoria}</span>
                  {r.disciplina && <span>{discLabel(r.disciplina)}</span>}
                  <span>{fmtD(r.d)}</span>
                </div>
                {r.umiestnenie && <div className="res-place">🏅 {r.umiestnenie}</div>}
                {r.poznamka && <div className="muted small" style={{ marginTop: 2 }}>{r.poznamka}</div>}
              </div>
              <button className="del" onClick={() => del(r.id)}>Zmazať</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
