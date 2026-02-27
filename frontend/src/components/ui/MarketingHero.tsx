import React from "react";
import { Link } from "react-router-dom";
import "./MarketingHero.css";

interface MarketingHeroProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel: string;
  secondaryTo: string;
}

const MarketingHero: React.FC<MarketingHeroProps> = ({
  title,
  subtitle,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}) => {
  return (
    <section className="marketing-hero ui-card">
      <div className="hero-gradient-layer" />
      <div className="hero-top">
        <div className="hero-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="hero-cta-row">
            <Link className="btn-primary hero-btn" to={primaryTo}>
              {primaryLabel}
            </Link>
            <Link className="btn-secondary hero-btn" to={secondaryTo}>
              {secondaryLabel}
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-window">
            <div className="hero-window-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-window-grid">
              <div className="tile large" />
              <div className="tile" />
              <div className="tile" />
              <div className="tile wide" />
            </div>
          </div>
        </div>
      </div>
      <div className="hero-stats">
        <article>
          <strong>3x faster</strong>
          <span>Post publishing flow</span>
        </article>
        <article>
          <strong>100% responsive</strong>
          <span>Mobile and desktop layouts</span>
        </article>
        <article>
          <strong>Accessible by default</strong>
          <span>Visible focus and keyboard-friendly UI</span>
        </article>
      </div>
    </section>
  );
};

export default MarketingHero;
