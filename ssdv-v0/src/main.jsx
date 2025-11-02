import React from 'react'
import ReactDOM from 'react-dom/client'
import SSDVDecoder from './App.jsx'
import './index.css'   //  make sure Tailwind is loaded

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SSDVDecoder />
  </React.StrictMode>,
)
