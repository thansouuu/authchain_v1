import { Buffer } from 'buffer/';

// Khởi tạo global
window.Buffer = Buffer;
window.global = window.global || window;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'

// -------------------------------------------------------------

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)