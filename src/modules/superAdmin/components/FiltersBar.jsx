const FiltersBar = ({ children }) => {
  if (!children) {
    return null;
  }

  return (
    <div className="sa-filters-bar" aria-label="Table filters">
      {children}
    </div>
  );
};

export default FiltersBar;
