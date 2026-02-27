import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./searchPage.css";

const RECOMMENDED = [
  "Wedding",
  "Work",
  "Daily",
  "Sporty",
  "Streetwear",
  "Formal",
  "Party",
  "Minimal",
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const handleSearch = (nextQuery = query) => {
    setActiveQuery(nextQuery.trim());
  };

  const clearSearch = () => {
    setQuery("");
    setActiveQuery("");
  };

  return (
    <div className="search-page-shell">
      <section className="search-page-card">
        <button type="button" className="search-back-btn" onClick={() => navigate("/feed")}>
          Back to Home
        </button>

        <header className="search-page-header">
          <h1>Search Looks</h1>
          <p>Find outfits by occasion, style, or vibe.</p>
        </header>

        <form
          className="search-bar"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <div className="search-input-wrap">
            <svg viewBox="0 0 24 24" className="search-input-icon" aria-hidden="true" focusable="false">
              <path d="M10.5 3a7.5 7.5 0 1 1 4.72 13.33l4.22 4.23a.75.75 0 1 1-1.06 1.06l-4.23-4.22A7.5 7.5 0 0 1 10.5 3Zm0 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="search-input"
              placeholder="Search by keywords (e.g., wedding, work, sporty, streetwear)…"
              aria-label="Search looks by keyword"
            />
            {query.length > 0 && (
              <button type="button" className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
                X
              </button>
            )}
          </div>
          <button type="submit" className="search-submit-btn">
            Search
          </button>
        </form>

        <section className="recommended-section" aria-label="Recommended searches">
          <p>Recommended</p>
          <div className="recommended-chips">
            {RECOMMENDED.map((item) => (
              <button
                key={item}
                type="button"
                className={`recommended-chip ${query.toLowerCase() === item.toLowerCase() ? "chip-active" : ""}`}
                onClick={() => {
                  setQuery(item);
                  handleSearch(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="results-section" aria-live="polite">
          <div className="results-head">
            <h2>Results</h2>
            {activeQuery ? <span>for "{activeQuery}"</span> : <span>not searched yet</span>}
          </div>
          <div className="results-empty">Results will appear here once search is connected.</div>
        </section>
      </section>
    </div>
  );
}
