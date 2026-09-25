import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'CML Result Portal - Live Fest Results & Management',
  description: 'Live event results, candidate registration, and real-time Sakha & Mekhala points leaderboards.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <footer style={{
          textAlign: 'center',
          padding: '2.5rem 1rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '4rem'
        }}>
          <p>© {new Date().getFullYear()} CML Results Management System • Database: <strong>CMLResult</strong></p>
        </footer>
      </body>
    </html>
  );
}
