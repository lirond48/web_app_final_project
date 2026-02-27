import React from "react";
import { SearchLookFilter } from "./searchTypes";

type SearchFiltersProps = {
  selected?: string;
  onSelect: (filter: SearchLookFilter) => void;
  filters: SearchLookFilter[];
};

const SearchFilters: React.FC<SearchFiltersProps> = ({ selected, onSelect, filters }) => {
  return (
    <div className="search-filters" aria-label="Recommended filters">
      {filters.map((filter) => {
        const isActive = selected?.toLowerCase() === filter.toLowerCase();
        return (
          <button
            type="button"
            key={filter}
            className={`search-chip ${isActive ? "search-chip-active" : ""}`}
            onClick={() => onSelect(filter)}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
};

export default SearchFilters;
