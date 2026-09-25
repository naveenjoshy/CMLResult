'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [dbInfo, setDbInfo] = useState({
    connected: false,
    status: 'checking',
    dbName: 'CMLResult',
    isConfigured: false,
  });

  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/db-status');
        const data = await res.json();
        setDbInfo({
          connected: data.connected,
          status: data.status,
          dbName: data.dbName || 'CMLResult',
          isConfigured: data.isConfigured,
        });
      } catch (err) {
        setDbInfo({
          connected: false,
          status: 'offline',
          dbName: 'CMLResult',
          isConfigured: false,
        });
      }
    }
    checkDb();
    const interval = setInterval(checkDb, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link href="/" className="nav-brand">
          <div className="brand-badge">🏆</div>
          <div>
            <span>CML Result</span>
            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              Fest Portal
            </span>
          </div>
        </Link>

        <nav>
          <ul className="nav-links">
            <li>
              <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
                <span>📊</span> Dashboard
              </Link>
            </li>
            <li>
              <Link href="/register" className={`nav-link ${pathname === '/register' ? 'active' : ''}`}>
                <span>✍️</span> Register Candidate
              </Link>
            </li>
            <li>
              <Link href="/admin" className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}>
                <span>⚙️</span> Admin Portal
              </Link>
            </li>
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            className={`nav-status ${dbInfo.connected ? '' : 'offline'}`}
            title={dbInfo.connected ? `Connected to MongoDB database: ${dbInfo.dbName}` : 'Running with local memory fallback (Paste MongoDB Atlas URI in .env or Admin)'}
          >
            <span className="status-dot"></span>
            <span>
              {dbInfo.connected ? `DB: ${dbInfo.dbName}` : 'DB: Local/Fallback'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
