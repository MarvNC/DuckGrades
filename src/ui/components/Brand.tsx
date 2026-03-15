import { Link } from "react-router-dom";

type BrandProps = {
  home?: boolean;
  className?: string;
};

export function Brand({ home = false, className = "" }: BrandProps) {
  const classes = ["brand", home ? "brand-home" : "", className].filter(Boolean).join(" ");

  return (
    <Link to="/" className={classes}>
      <img src="/duckgrades.png" alt="" aria-hidden="true" className="brand-logo" width={512} height={512} />
      <span className="brand-wordmark">
        <span className="brand-duck">Duck</span>
        <span className="brand-grades">Grades</span>
      </span>
    </Link>
  );
}
