import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import {
  TEST_PAPER_SCOPES,
  TEST_PAPER_TYPE_OPTIONS,
} from "../constants/paperTypes";
import { routeBuilders, ROUTES } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import { useAppToast } from "../components/notifications/useAppToast";
import "./testPaperAdmin.css";

const initialFilters = {
  search: "",
  subjectId: "",
  type: "",
  scope: "",
  year: "",
};

const ManageTestPapersPage = () => {
  const { pushToast } = useAppToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [formOptions, setFormOptions] = useState({
    subjects: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [papersResponse, optionsResponse] = await Promise.all([
        testPaperService.listPapersForAdmin(filters),
        testPaperService.getFormOptions(),
      ]);

      setItems(papersResponse.items || []);
      setFormOptions({ subjects: optionsResponse.subjects || [] });
    } catch (loadError) {
      setError(loadError.message || "Unable to load test papers.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();

    const unsubscribe = testPaperService.subscribeToChanges(() => {
      loadData();
    });

    return () => {
      unsubscribe?.();
    };
  }, [loadData]);

  const uniqueYears = useMemo(() => {
    const years = new Set(items.map((item) => String(item.year)));
    return [...years].sort((left, right) => Number(right) - Number(left));
  }, [items]);

  const handleDelete = async (id, title) => {
    const allow = window.confirm(`Delete paper "${title}"? This action cannot be undone.`);
    if (!allow) return;

    try {
      await testPaperService.deletePaper(id);
      pushToast({
        title: "Paper deleted",
        message: "The paper has been removed from student and admin views.",
        tone: "success",
      });
      loadData();
    } catch (deleteError) {
      pushToast({
        title: "Delete failed",
        message: deleteError.message || "Could not delete paper.",
        tone: "error",
      });
    }
  };

  return (
    <section className="tp-admin-page">
      <header className="tp-admin-hero">
        <div>
          <p>Exam Vault Admin</p>
          <h1>Manage Test Papers</h1>
          <span>Create and map PYC, MTP, RTP, and other paper sets in one place.</span>
        </div>

        <Link to={ROUTES.admin.testPapersCreate} className="tp-admin-hero__cta">
          <Plus size={16} />
          <span>Add Paper</span>
        </Link>
      </header>

      <section className="tp-admin-filters" aria-label="Filters">
        <label>
          <span>Search</span>
          <input
            type="search"
            value={filters.search}
            placeholder="Search by title, subject, chapter"
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
        </label>

        <label>
          <span>Subject</span>
          <select
            value={filters.subjectId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, subjectId: event.target.value }))
            }
          >
            <option value="">All subjects</option>
            {formOptions.subjects.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Type</span>
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="">All types</option>
            {TEST_PAPER_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption.value} value={typeOption.value}>
                {typeOption.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Scope</span>
          <select
            value={filters.scope}
            onChange={(event) => setFilters((prev) => ({ ...prev, scope: event.target.value }))}
          >
            <option value="">All scopes</option>
            <option value={TEST_PAPER_SCOPES.CHAPTER_WISE}>Chapter Wise</option>
            <option value={TEST_PAPER_SCOPES.FULL_SYLLABUS}>Full Syllabus</option>
          </select>
        </label>

        <label>
          <span>Year</span>
          <select
            value={filters.year}
            onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
          >
            <option value="">All years</option>
            {uniqueYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="tp-admin-error">{error}</p> : null}

      <section className="tp-admin-table-shell" aria-label="Test paper list">
        {loading ? (
          <div className="tp-admin-loading-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={`loader-${index}`} className="tp-admin-loading-bar" />
            ))}
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <article className="tp-admin-empty-state">
            <h2>No test papers found</h2>
            <p>Adjust filters or add your first paper.</p>
          </article>
        ) : null}

        {!loading && items.length > 0 ? (
          <>
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Chapter</th>
                    <th>Type</th>
                    <th>Scope</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.year}</td>
                      <td>{item.title}</td>
                      <td>{item.subjectName}</td>
                      <td>{item.chapterName}</td>
                      <td>{item.type}</td>
                      <td>{item.scope === TEST_PAPER_SCOPES.CHAPTER_WISE ? "Chapter" : "Syllabus"}</td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <Link
                            to={routeBuilders.admin.testPapersEdit(item.id)}
                            aria-label={`Edit ${item.title}`}
                          >
                            <PencilLine size={14} />
                            <span>Edit</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tp-admin-mobile-list">
              {items.map((item) => (
                <article key={`mobile-${item.id}`} className="tp-admin-mobile-card">
                  <h3>{item.title}</h3>
                  <p>{item.subjectName} | {item.chapterName}</p>
                  <small>{item.type} | {item.year}</small>

                  <div className="tp-admin-row-actions">
                    <Link to={routeBuilders.admin.testPapersEdit(item.id)}>
                      <PencilLine size={14} />
                      <span>Edit</span>
                    </Link>
                    <button type="button" onClick={() => handleDelete(item.id, item.title)}>
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </section>
  );
};

export default ManageTestPapersPage;
