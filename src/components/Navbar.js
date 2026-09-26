'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [dbInfo, setDbInfo] = useState({
    connected: false,
    status: 'checking',
    isConfigured: false,
  });

  const isPublicPage = pathname === '/' || pathname === '/register';

  useEffect(() => {
    if (!isAdminRoute) {
      setAdminAuthenticated(false);
      return;
    }

    let active = true;
    async function checkAdminSession() {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        if (active) setAdminAuthenticated(response.ok);
      } catch (err) {
        if (active) setAdminAuthenticated(false);
      }
    }

    checkAdminSession();
    window.addEventListener('cml-admin-session-changed', checkAdminSession);
    return () => {
      active = false;
      window.removeEventListener('cml-admin-session-changed', checkAdminSession);
    };
  }, [isAdminRoute]);

  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/db-status', { cache: 'no-store' });
        const data = await res.json();
        setDbInfo({
          connected: data.connected === true,
          status: data.status,
          isConfigured: data.isConfigured,
        });
      } catch (err) {
        setDbInfo({
          connected: false,
          status: 'offline',
          isConfigured: false,
        });
      }
    }
    checkDb();
    const interval = setInterval(checkDb, 15000);
    return () => clearInterval(interval);
  }, []);

  const dbStatusBadge = (
    <div
      className={`nav-status ${dbInfo.connected ? '' : 'offline'}`}
      title={`Database ${dbInfo.connected ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
    >
      <span className="status-dot"></span>
      <span>{dbInfo.connected ? 'Online' : 'Offline'}</span>
    </div>
  );

  // Public View: Clean festival banner with subtle Admin access button
  if (isPublicPage) {
    return (
      <header className="navbar" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="container nav-container" style={{ padding: '0.85rem 1rem' }}>
          {/* Brand - left aligned on public */}
          <div className="nav-brand" style={{ cursor: 'default' }}>
            <div className="brand-badge" style={{ animation: 'none' }}>🏆</div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>CML Result</span>
              <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Cherupushpam Mission League • Official Fest Portal
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {dbStatusBadge}
            {/* Subtle Admin access button - always visible */}
            <Link
              href="/admin"
              style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <span>⚙️</span> Admin
            </Link>
          </div>
        </div>
      </header>
    );
  }


  // Admin View: Full navigation bar
  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link href="/" className="nav-brand">
          <div className="brand-badge">🏆</div>
          <div>
            <span>CML Result</span>
            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              Admin View
            </span>
          </div>
        </Link>

        {(!isAdminRoute || adminAuthenticated) && (
          <nav>
            <ul className="nav-links">
              <li>
                <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
                  <span>📊</span> Dashboard
                </Link>
              </li>
              <li>
                <Link href="/register" className={`nav-link ${pathname === '/register' ? 'active' : ''}`}>
                  <span>✍️</span> Register
                </Link>
              </li>
              <li>
                <Link href="/admin" className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}>
                  <span>⚙️</span> Admin Portal
                </Link>
              </li>
            </ul>
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {dbStatusBadge}
        </div>
      </div>
    </header>
  );
}
