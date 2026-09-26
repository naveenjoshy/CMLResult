import Link from 'next/link';
import BrandBanner from '@/components/BrandBanner';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1.5rem', color: '#fff' }}>
      <BrandBanner className="hero-brand-title" />
      <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>404 - Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="btn btn-primary">
        Return Home
      </Link>
    </div>
  );
}
