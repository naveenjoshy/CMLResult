'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/register';

  if (isPublicPage) {
    return (
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '4rem',
      }}>
        <p>© {new Date().getFullYear()} Cherupushpam Mission League • Arang 2K26 - Results</p>
      </footer>
    );
  }

  return (
    <footer style={{
      textAlign: 'center',
      padding: '2.5rem 1rem',
      color: 'var(--text-muted)',
      fontSize: '0.85rem',
      borderTop: '1px solid var(--border-subtle)',
      marginTop: '4rem',
    }}>
      <p>© {new Date().getFullYear()} CML Results Management System • Database: <strong>CMLResult</strong></p>
    </footer>
  );
}
