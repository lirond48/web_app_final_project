import React from "react";

type SearchInputProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
};

const SearchInput: React.FC<SearchInputProps> = ({ query, onQueryChange, onSubmit, onClear, isLoading }) => {
  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="search-input-wrap">
        <svg viewBox="0 0 24 24" className="search-input-icon" aria-hidden="true" focusable="false">
          <path d="M10.5 3a7.5 7.5 0 1 1 4.72 13.33l4.22 4.23a.75.75 0 1 1-1.06 1.06l-4.23-4.22A7.5 7.5 0 0 1 10.5 3Zm0 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
        </svg>
        <input
          className="ui-input search-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search outfits by style, occasion, or season..."
          aria-label="Search looks"
        />
        {query.trim().length > 0 && (
          <button type="button" onClick={onClear} className="search-clear-btn" aria-label="Clear search query">
            X
          </button>
        )}
      </div>
      <button className="btn-primary search-submit" type="submit" disabled={isLoading}>
        {isLoading ? "Searching..." : "Search"}
      </button>
    </form>
  );
};

export default SearchInput;
