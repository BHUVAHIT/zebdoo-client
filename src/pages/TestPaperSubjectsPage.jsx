import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import { InlineLoadingNotice } from "../components/loading/LoadingPrimitives";
import SubjectCard from "../components/SubjectCard";
import { TEST_PAPER_MODULE } from "../constants/paperTypes";
import { routeBuilders, ROUTES } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import "./testPapers.css";

const TestPaperSubjectsPage = () => {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const activeRequestRef = useRef(null);
  const syncReloadTimeoutRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSubjects = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const response = await testPaperService.getSubjectsForStudent({
        signal: controller.signal,
      });

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setSubjects(response);
    } catch (loadError) {
      if (loadError?.name === "AbortError") {
        return;
      }

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setError(loadError.message || "Unable to load subjects right now.");
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setLoading(false);
      }

      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadSubjects();

    const unsubscribe = testPaperService.subscribeToChanges(() => {
      if (syncReloadTimeoutRef.current) {
        window.clearTimeout(syncReloadTimeoutRef.current);
      }

      syncReloadTimeoutRef.current = window.setTimeout(() => {
        syncReloadTimeoutRef.current = null;
        loadSubjects();
      }, 60);
    });

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      unsubscribe?.();
      if (syncReloadTimeoutRef.current) {
        window.clearTimeout(syncReloadTimeoutRef.current);
        syncReloadTimeoutRef.current = null;
      }
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

  const activeSubjectLabel = useMemo(() => {
    if (loading) return "Loading subjects...";
    if (!searchTerm.trim()) return `${subjects.length} active subjects`;
    return `${filteredSubjects.length} of ${subjects.length} subjects matched`;
  }, [filteredSubjects.length, loading, searchTerm, subjects.length]);

  return (
    <section className="exam-vault-shell">
      <section className="exam-vault-page">
        <header className="exam-vault-hero">
          <div className="exam-vault-hero__top-row">
            <div className="exam-vault-breadcrumbs" aria-label="Breadcrumb">
              <Link to={ROUTES.student.dashboard} className="exam-vault-breadcrumb-link">
                Dashboard
              </Link>
              <span>/</span>
              <strong className="exam-vault-breadcrumb-current">{TEST_PAPER_MODULE.name}</strong>
            </div>
            <span className="exam-vault-info-chip">Live sync with Super Admin</span>
          </div>

          <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
          <h1>Choose your subject and start targeted practice.</h1>
          <p>{TEST_PAPER_MODULE.subtitle}</p>
        </header>

        <section className="exam-vault-subjects-shell" aria-label="Subjects">
          <div className="exam-vault-subjects-shell__header">
            <h2>Choose Your Subject</h2>
            <span>{activeSubjectLabel}</span>
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

          {loading ? (
            <>
              <InlineLoadingNotice label="Loading published subjects for your exam vault..." />
              <Loader count={8} className="exam-vault-subject-grid" />
            </>
          ) : null}

          {!loading && error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Unable to load subjects"
              description={error}
              actionLabel="Retry"
              onAction={loadSubjects}
            />
          ) : null}

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
