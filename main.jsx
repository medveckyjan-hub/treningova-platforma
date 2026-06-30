import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './AuthContext'
import { AthleteProvider } from './AthleteContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AthleteProvider>
          <App />
        </AthleteProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
