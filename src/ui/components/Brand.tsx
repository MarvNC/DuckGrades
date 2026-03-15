import { Link } from "react-router-dom";
import type { MouseEventHandler } from "react";
import duckgradesLogo from "../../assets/duckgrades.png";

type BrandProps = {
  home?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function Brand({ home = false, className = "", onClick }: BrandProps) {
  const classes = ["brand", home ? "brand-home" : "", className].filter(Boolean).join(" ");

  return (
    <Link to="/" className={classes} onClick={onClick}>
      <img src={duckgradesLogo} alt="" aria-hidden="true" className="brand-logo" width={512} height={512} />
      <span className="brand-wordmark">
        <span className="brand-duck">Duck</span>
        <span className="brand-grades">Grades</span>
      </span>
    </Link>
  );
}
