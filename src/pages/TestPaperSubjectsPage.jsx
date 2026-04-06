import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  return (
    <section className="exam-vault-page">
      <header className="exam-vault-hero">
        <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
        <h1>Practice with confidence, attempt with precision.</h1>
        <p>{TEST_PAPER_MODULE.subtitle}</p>
      </header>

      <section className="exam-vault-subjects-shell" aria-label="Subjects">
        <div className="exam-vault-subjects-shell__header">
          <h2>Choose Your Subject</h2>
          <span>{subjects.length} active subjects</span>
        </div>

        {loading ? (
          <div className="exam-vault-subject-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <article key={`skeleton-${index}`} className="exam-vault-skeleton-card" />
            ))}
          </div>
        ) : null}

        {!loading && error ? <p className="exam-vault-error-text">{error}</p> : null}

        {!loading && !error && subjects.length === 0 ? (
          <article className="exam-vault-empty-state">
            <h3>No subjects are published yet</h3>
            <p>
              Your super admin can publish subjects and chapters from the admin panel to
              unlock this section.
            </p>
          </article>
        ) : null}

        {!loading && !error && subjects.length > 0 ? (
          <div className="exam-vault-subject-grid">
            {subjects.map((subject, index) => (
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
  );
};

export default TestPaperSubjectsPage;
