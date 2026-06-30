import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import Layout from './Layout'
import Login from './Login'
import Register from './Register'
import Skutocnost from './Skutocnost'
import Kalendar from './Kalendar'
import Vysledky from './Vysledky'
import Profil from './Profil'
import Nastavenia from './Nastavenia'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Skutocnost />} />
        <Route path="kalendar" element={<Kalendar />} />
        <Route path="vysledky" element={<Vysledky />} />
        <Route path="profil" element={<Profil />} />
        <Route path="nastavenia" element={<Nastavenia />} />
      </Route>
    </Routes>
  )
}
