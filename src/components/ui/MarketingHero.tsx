import React from "react";
import { Link } from "react-router-dom";
import "./MarketingHero.css";

interface MarketingHeroProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryTo: string;
}

const MarketingHero: React.FC<MarketingHeroProps> = ({
  title,
  subtitle,
  primaryLabel,
  primaryTo,
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
          <strong>Seasonal inspiration</strong>
          <span>Looks for winter, fall, summer, and spring</span>
        </article>
        <article>
          <strong>Outfits for every occasion</strong>
          <span>Work, weddings, sporty days and more</span>
        </article>
        <article>
          <strong>Style community</strong>
          <span>Share your looks and discover new trends</span>
        </article>
      </div>
    </section>
  );
};

export default MarketingHero;
