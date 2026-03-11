import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./BrandLogo.css";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  showImage?: boolean;
  linkTo?: string;
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 32,
  showText = true,
  showImage = true,
  linkTo,
  className = "",
}) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("../../assets/brand/logo.png")
      .then((module) => {
        if (isMounted) {
          setLogoSrc(module.default);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLogoSrc(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const content = (
    <>
      {showImage && logoSrc ? (
        <img
          src={logoSrc}
          alt="StyleShare logo"
          width={size}
          height={size}
          className="brand-logo-image"
          onError={() => setLogoSrc(null)}
        />
      ) : showImage && !showText ? (
        <span className="brand-logo-fallback">StyleShare</span>
      ) : null}
      {showText && <span className="brand-logo-text">StyleShare</span>}
    </>
  );

  const rootClassName = `brand-logo ${className}`.trim();

  if (linkTo) {
    return (
      <Link to={linkTo} className={rootClassName} aria-label="Go to home">
        {content}
      </Link>
    );
  }

  return <div className={rootClassName}>{content}</div>;
};

export default BrandLogo;
