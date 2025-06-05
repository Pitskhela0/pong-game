import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily removing React.StrictMode to fix socket connection issues
  // React.StrictMode causes components to mount/unmount/mount again in development
  // which interrupts the socket connection process
  <App />
)