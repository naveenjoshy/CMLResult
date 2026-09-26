import Image from 'next/image';

export default function BrandLogo({ className = '' }) {
  return (
    <Image
      src="/logo.png"
      alt="Cherupushpa Mission League logo"
      width={1561}
      height={1600}
      className={`brand-logo ${className}`.trim()}
      unoptimized
    />
  );
}