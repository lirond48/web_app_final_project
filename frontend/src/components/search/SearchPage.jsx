import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Post from "../post/Post";
import { searchService } from "../../services/search.service";
import "./searchPage.css";

const RECOMMENDED = ["Wedding", "Work", "Daily", "Sporty", "Streetwear", "Formal", "Party", "Minimal"];
const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 500;

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [version, setVersion] = useState(0);

  const handleSearch = (nextQuery = query) => {
    setQuery(nextQuery);
    setVersion((v) => v + 1);
  };

  const clearSearch = () => {
    setQuery("");
    setActiveQuery("");
    setResults([]);
    setError("");
    setHasSearched(false);
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setIsLoading(false);
      setError("");
      setResults([]);
      setActiveQuery("");
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      setHasSearched(true);
      try {
        const response = await searchService.searchPosts(trimmed, controller.signal);
        setResults(Array.isArray(response.results) ? response.results : []);
        setActiveQuery(trimmed);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setResults([]);
        setActiveQuery(trimmed);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, version]);

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
              placeholder="Search by keywords (e.g., elegant white wedding)"
              aria-label="Search looks by keyword"
            />
            {query.length > 0 && (
              <button type="button" className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
                X
              </button>
            )}
          </div>
          <button type="submit" className="search-submit-btn" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
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
                onClick={() => handleSearch(item)}
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

          {isLoading && <div className="results-empty">Searching...</div>}
          {!isLoading && error && <div className="results-empty">Search failed: {error}</div>}
          {!isLoading && !error && hasSearched && results.length === 0 && <div className="results-empty">No results found.</div>}
          {!isLoading && !error && !hasSearched && (
            <div className="results-empty">Type at least 3 characters to search.</div>
          )}
          {!isLoading && !error && results.length > 0 && (
            <div className="results-list">
              {results.map((item, index) => (
                <article key={`${item?.post?._id ?? index}`} className="result-item">
                  <div className="result-meta">Score {item.score}</div>
                  <Post post={item.post} hideActions />
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
