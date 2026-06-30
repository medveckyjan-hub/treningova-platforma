import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const ACCENT = '#a78bfa'
const ROLES = [['sportovec', 'Športovec'], ['trener', 'Tréner'], ['rodic', 'Rodič'], ['admin', 'Admin']]
const roleLabel = (v) => ROLES.find((r) => r[0] === v)?.[1] || v
const fullName = (p) => `${p?.meno || ''} ${p?.priezvisko || ''}`.trim() || p?.email || '—'

export default function Nastavenia() {
  const { role } = useAuth()
  const [tab, setTab] = useState(role === 'admin' ? 'users' : 'groups')

  if (role !== 'admin' && role !== 'trener')
    return (
      <div className="page">
        <h2 className="page-title" style={{ color: ACCENT }}>Nastavenia</h2>
        <div className="card placeholder">Táto sekcia je len pre trénerov a adminov.</div>
      </div>
    )

  return (
    <div className="page">
      <h2 className="page-title" style={{ color: ACCENT }}>Nastavenia</h2>
      <div className="seg">
        {role === 'admin' && (
          <button className={'segbtn' + (tab === 'users' ? ' on' : '')}
            style={tab === 'users' ? { background: 'rgba(167,139,250,0.18)', color: ACCENT } : undefined}
            onClick={() => setTab('users')}>Užívatelia</button>
        )}
        <button className={'segbtn' + (tab === 'groups' ? ' on' : '')}
          style={tab === 'groups' ? { background: 'rgba(167,139,250,0.18)', color: ACCENT } : undefined}
          onClick={() => setTab('groups')}>Skupiny</button>
      </div>
      {tab === 'users' && role === 'admin' && <UsersAdmin />}
      {tab === 'groups' && <GroupsAdmin />}
    </div>
  )
}

// ---------- UŽÍVATELIA ----------
function UsersAdmin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').order('priezvisko')
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  const changeRole = async (id, account_type) => {
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, account_type } : x)))
    await supabase.from('profiles').update({ account_type }).eq('id', id)
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  const filtered = users.filter((u) => fullName(u).toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <input className="inp" placeholder="Hľadať užívateľa…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="muted small" style={{ marginBottom: 8 }}>Spolu: {users.length}</div>
      {filtered.map((u) => (
        <div key={u.id} className="card sk-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{fullName(u)}</div>
              <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
            </div>
            <select className="selbox" value={u.account_type} onChange={(e) => changeRole(u.id, e.target.value)}>
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      ))}
    </>
  )
}

// ---------- SKUPINY ----------
function GroupsAdmin() {
  const [groups, setGroups] = useState([])
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  const reload = async () => {
    const [g, m, u] = await Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('group_members').select('*'),
      supabase.from('profiles').select('id, meno, priezvisko, email, account_type'),
    ])
    setGroups(g.data || []); setMembers(m.data || []); setUsers(u.data || []); setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const createGroup = async () => {
    if (!newName.trim()) return
    const { data } = await supabase.from('groups').insert({ name: newName.trim() }).select('*').single()
    if (data) { setGroups((g) => [...g, data].sort((a, b) => a.name.localeCompare(b.name))); setNewName('') }
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="card sk-card">
        <div className="lbl-s">Nová skupina</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" placeholder="napr. Mládež A" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={createGroup}>Vytvoriť</button>
        </div>
      </div>
      {groups.length === 0 && <div className="muted" style={{ padding: 8 }}>Zatiaľ žiadne skupiny.</div>}
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} users={users}
          members={members.filter((m) => m.group_id === g.id)} onChange={reload} />
      ))}
    </>
  )
}

function GroupCard({ group, users, members, onChange }) {
  const [addId, setAddId] = useState('')
  const [addRole, setAddRole] = useState('sportovec')
  const [addPerm, setAddPerm] = useState('citanie')
  const memberIds = members.map((m) => m.profile_id)
  const avail = users.filter((u) => !memberIds.includes(u.id))
  const uById = Object.fromEntries(users.map((u) => [u.id, u]))

  const add = async () => {
    if (!addId) return
    await supabase.from('group_members').insert({ group_id: group.id, profile_id: addId, role: addRole, plan_permission: addRole === 'trener' ? addPerm : 'citanie' })
    setAddId(''); onChange()
  }
  const remove = async (pid) => { await supabase.from('group_members').delete().eq('group_id', group.id).eq('profile_id', pid); onChange() }

  return (
    <div className="card sk-card">
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{group.name}</div>
      {members.length === 0 && <div className="muted small" style={{ marginBottom: 8 }}>Žiadni členovia.</div>}
      {members.map((m) => (
        <div key={m.profile_id} className="memrow">
          <div>
            <span style={{ fontWeight: 600 }}>{fullName(uById[m.profile_id])}</span>
            <span className={'mem-badge ' + (m.role === 'trener' ? 'b-tr' : 'b-sp')}>
              {m.role === 'trener' ? `Tréner · ${m.plan_permission === 'zapis' ? 'zápis' : 'čítanie'}` : 'Hráč'}
            </span>
          </div>
          <button className="del" onClick={() => remove(m.profile_id)}>×</button>
        </div>
      ))}
      <div className="addmem">
        <select className="selbox" value={addId} onChange={(e) => setAddId(e.target.value)}>
          <option value="">+ pridať osobu…</option>
          {avail.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}
        </select>
        <select className="selbox" value={addRole} onChange={(e) => setAddRole(e.target.value)}>
          <option value="sportovec">Hráč</option>
          <option value="trener">Tréner</option>
        </select>
        {addRole === 'trener' && (
          <select className="selbox" value={addPerm} onChange={(e) => setAddPerm(e.target.value)}>
            <option value="citanie">čítanie</option>
            <option value="zapis">zápis</option>
          </select>
        )}
        <button className="btn" style={{ width: 'auto', padding: '0 14px' }} onClick={add} disabled={!addId}>Pridať</button>
      </div>
    </div>
  )
}
