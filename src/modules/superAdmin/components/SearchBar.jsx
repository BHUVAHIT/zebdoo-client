import { Search } from "lucide-react";

const SearchBar = ({ value, onChange, placeholder = "Search records", className = "" }) => {
  return (
    <label className={`sa-search ${className}`.trim()}>
      <Search
        size={16}
        className="sa-search__icon"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="sa-search__input"
      />
    </label>
  );
};

export default SearchBar;
