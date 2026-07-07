import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import GuestOrderApp from './pages/GuestOrderApp.jsx';
import LandlordApp from './pages/LandlordApp.jsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<GuestOrderApp />} />
        <Route path="/vermieter" element={<LandlordApp />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
