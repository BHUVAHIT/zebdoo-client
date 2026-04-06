import PaperCard from "./PaperCard";

const CategorySection = ({ category, papers = [], viewMode = "table", onOpenPaper }) => {
  return (
    <section className="exam-vault-category-section" id={`paper-category-${category.value}`}>
      <header className="exam-vault-category-section__head">
        <div>
          <p>{category.shortLabel}</p>
          <h3>{category.label}</h3>
        </div>
        <span>{papers.length} papers</span>
      </header>

      {papers.length === 0 ? (
        <div className="exam-vault-category-section__empty">
          No papers available in this category for the selected filter.
        </div>
      ) : null}

      {papers.length > 0 && viewMode === "table" ? (
        <div className="exam-vault-paper-table-shell">
          <table className="exam-vault-paper-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Paper Name</th>
                <th>Chapter</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((paper) => (
                <tr key={paper.id}>
                  <td>{paper.year}</td>
                  <td>{paper.title}</td>
                  <td>{paper.chapterName}</td>
                  <td>
                    <button type="button" onClick={() => onOpenPaper?.(paper)}>
                      Open PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {papers.length > 0 && viewMode === "card" ? (
        <div className="exam-vault-paper-grid">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} onOpen={onOpenPaper} />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default CategorySection;
