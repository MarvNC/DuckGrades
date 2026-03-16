import { Link } from 'react-router-dom';
import type { MouseEventHandler } from 'react';

type BrandProps = {
  home?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  hideWordmarkOnTiny?: boolean;
};

export function Brand({
  home = false,
  className = '',
  onClick,
  hideWordmarkOnTiny = false,
}: BrandProps) {
  const classes = ['brand', home ? 'brand-home' : '', className].filter(Boolean).join(' ');
  const wordmarkClasses = [
    'brand-wordmark',
    hideWordmarkOnTiny ? 'hidden min-[390px]:inline-flex' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link to="/" className={classes} onClick={onClick}>
      <img
        src="/logo-384.png"
        alt=""
        aria-hidden="true"
        className="brand-logo"
        fetchPriority="high"
        width={384}
        height={384}
      />
      <span className={wordmarkClasses}>
        <span className="brand-duck">Duck</span>
        <span className="brand-grades">Grades</span>
      </span>
    </Link>
  );
}
