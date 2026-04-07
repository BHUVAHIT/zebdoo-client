import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import SubjectCard from "../components/SubjectCard";
import { TEST_PAPER_MODULE } from "../constants/paperTypes";
import { routeBuilders } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import "./testPapers.css";

const TestPaperSubjectsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await testPaperService.getSubjectsForStudent();
      setSubjects(response);
    } catch (loadError) {
      setError(loadError.message || "Unable to load subjects right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();

    const unsubscribe = testPaperService.subscribeToChanges(() => {
      loadSubjects();
    });

    return () => {
      unsubscribe?.();
    };
  }, [loadSubjects]);

  const filteredSubjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return subjects;

    return subjects.filter((subject) => {
      const haystack = [subject.name, subject.code, subject.description].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, subjects]);

  return (
    <section className="exam-vault-shell">
      <section className="exam-vault-page">
        <header className="exam-vault-hero">
          <div className="exam-vault-breadcrumbs" aria-label="Breadcrumb">
            <span>Student</span>
            <span>/</span>
            <strong>{TEST_PAPER_MODULE.name}</strong>
          </div>
          <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
          <h1>Practice with confidence, attempt with precision.</h1>
          <p>{TEST_PAPER_MODULE.subtitle}</p>
        </header>

        <section className="exam-vault-subjects-shell" aria-label="Subjects">
          <div className="exam-vault-subjects-shell__header">
            <h2>Choose Your Subject</h2>
            <span>{subjects.length} active subjects</span>
          </div>

          <label className="exam-vault-search-input" htmlFor="subject-search">
            <Search size={16} aria-hidden="true" />
            <input
              id="subject-search"
              type="search"
              placeholder="Search subject by name, code, or keyword"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {loading ? <Loader count={8} className="exam-vault-subject-grid" /> : null}

          {!loading && error ? <p className="exam-vault-error-text">{error}</p> : null}

          {!loading && !error && subjects.length === 0 ? (
            <EmptyState
              title="No subjects are published yet"
              description="Your super admin can publish subjects and chapters from the admin panel to unlock this section."
            />
          ) : null}

          {!loading && !error && subjects.length > 0 && filteredSubjects.length === 0 ? (
            <EmptyState
              title="No subject matched your search"
              description="Try a different keyword to find your subject faster."
            />
          ) : null}

          {!loading && !error && filteredSubjects.length > 0 ? (
            <div className="exam-vault-subject-grid">
              {filteredSubjects.map((subject, index) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  index={index}
                  onSelect={() => navigate(routeBuilders.testPapers.subject(subject.id))}
                />
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </section>
  );
};

export default TestPaperSubjectsPage;
