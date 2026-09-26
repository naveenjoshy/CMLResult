'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

export default function Navbar() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [isRefreshingAdminData, setIsRefreshingAdminData] = useState(false);
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
    const handleRefreshComplete = () => setIsRefreshingAdminData(false);
    window.addEventListener('cml-admin-refresh-completed', handleRefreshComplete);
    return () => window.removeEventListener('cml-admin-refresh-completed', handleRefreshComplete);
  }, []);

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

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to clear admin session:', err);
    }
    window.dispatchEvent(new Event('cml-admin-session-changed'));
    window.location.assign('/admin');
  };

  const handleAdminRefresh = () => {
    setIsRefreshingAdminData(true);
    window.dispatchEvent(new Event('cml-admin-refresh-requested'));
  };

  // Public View: Clean festival banner with subtle Admin access button
  if (isPublicPage) {
    return (
      <header className="navbar" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="container nav-container" style={{ padding: '0.85rem 1rem' }}>
          {/* Brand - left aligned on public */}
          <div className="nav-brand" style={{ cursor: 'default' }}>
            <BrandLogo className="nav-brand-logo" />
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
          <BrandLogo className="nav-brand-logo" />
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
          {isAdminRoute && adminAuthenticated && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAdminRefresh}
              disabled={isRefreshingAdminData}
            >
              {isRefreshingAdminData ? 'Refreshing...' : 'Refresh Data'}
            </button>
          )}
          {isAdminRoute && adminAuthenticated && (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleAdminLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
