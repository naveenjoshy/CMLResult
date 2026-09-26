import Image from 'next/image';
import { BRAND_BANNER_SRC, DIOCESE_BRAND, SECONDARY_BANNER_SRC } from '@/lib/branding';

export default function BrandBanner({ className = '', showPrimary = true, showSecondary = true }) {
  if (!showPrimary && !showSecondary) return null;

  return (
    <div className={`brand-banner-stack ${className}`.trim()}>
      {showPrimary && (
        <Image
          src={BRAND_BANNER_SRC}
          alt={DIOCESE_BRAND}
          width={1850}
          height={276}
          className="brand-banner-primary"
          priority
          unoptimized
        />
      )}
      {showSecondary && (
        <Image
          src={SECONDARY_BANNER_SRC}
          alt="Arang 2K26"
          width={589}
          height={103}
          className="brand-banner-secondary"
          priority
          unoptimized
        />
      )}
    </div>
  );
}