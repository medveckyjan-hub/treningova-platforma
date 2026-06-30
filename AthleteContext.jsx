import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)
export const useAthlete = () => useContext(Ctx)

const SEL = 'id, meno, priezvisko, email, account_type, avatar'

export function AthleteProvider({ children }) {
  const { user, role } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (!user || !role) return
    let alive = true
    ;(async () => {
      let list = []
      if (role === 'admin') {
        const { data } = await supabase.from('profiles').select(SEL).order('priezvisko')
        list = data || []
      } else if (role === 'trener') {
        const { data: myg } = await supabase.from('group_members').select('group_id').eq('profile_id', user.id).eq('role', 'trener')
        const gids = [...new Set((myg || []).map((g) => g.group_id))]
        if (gids.length) {
          const { data: gm } = await supabase.from('group_members').select('profile_id').in('group_id', gids).eq('role', 'sportovec')
          const pids = [...new Set((gm || []).map((m) => m.profile_id))]
          if (pids.length) {
            const { data: ps } = await supabase.from('profiles').select(SEL).in('id', pids).order('priezvisko')
            list = ps || []
          }
        }
      } else if (role === 'rodic') {
        const { data: pl } = await supabase.from('parent_links').select('athlete_id').eq('parent_id', user.id)
        const pids = [...new Set((pl || []).map((x) => x.athlete_id))]
        if (pids.length) {
          const { data: ps } = await supabase.from('profiles').select(SEL).in('id', pids)
          list = ps || []
        }
      }
      if (!alive) return
      setAthletes(list)
      if (role === 'sportovec') setSelectedId(user.id)
      else if (list.find((a) => a.id === user.id)) setSelectedId(user.id)
      else setSelectedId(list[0]?.id || user.id)
    })()
    return () => { alive = false }
  }, [user?.id, role])

  const selectedAthlete = athletes.find((a) => a.id === selectedId) || null
  const canPick = (role === 'trener' || role === 'admin' || role === 'rodic')

  return (
    <Ctx.Provider value={{ athletes, selectedId: selectedId || user?.id || null, setSelectedId, selectedAthlete, canPick }}>
      {children}
    </Ctx.Provider>
  )
}

const nameOf = (a) => `${a?.meno || ''} ${a?.priezvisko || ''}`.trim() || a?.email || '—'

export function AthletePicker() {
  const { athletes, selectedId, setSelectedId, canPick } = useAthlete()
  if (!canPick || athletes.length === 0) return null
  return (
    <div className="picker">
      <span className="picker-l">Hráč</span>
      <select className="selbox" style={{ flex: 1 }} value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
        {athletes.map((a) => <option key={a.id} value={a.id}>{nameOf(a)}</option>)}
      </select>
    </div>
  )
}
