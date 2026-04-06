import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  TEST_PAPER_SCOPES,
  TEST_PAPER_SCOPE_OPTIONS,
  TEST_PAPER_TYPE_OPTIONS,
} from "../constants/paperTypes";
import { ROUTES } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import { useAppToast } from "../components/notifications/useAppToast";
import "./testPaperAdmin.css";

const getDefaultYear = () => new Date().getFullYear();

const createInitialState = () => ({
  subjectId: "",
  chapterId: "",
  scope: TEST_PAPER_SCOPES.CHAPTER_WISE,
  type: TEST_PAPER_TYPE_OPTIONS[0]?.value || "PYC",
  year: getDefaultYear(),
  title: "",
  pdfUrl: "",
});

const AddEditTestPaperForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pushToast } = useAppToast();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(createInitialState());
  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState({
    subjects: [],
    chaptersBySubject: {},
  });

  const chapterOptions = useMemo(
    () => options.chaptersBySubject?.[form.subjectId] || [],
    [form.subjectId, options.chaptersBySubject]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const optionResponse = await testPaperService.getFormOptions();
      setOptions(optionResponse);

      if (!isEditMode) {
        setLoading(false);
        return;
      }

      const paper = await testPaperService.getPaperByIdForAdmin(id);
      setForm({
        subjectId: paper.subjectId,
        chapterId: paper.chapterId || "",
        scope: paper.scope,
        type: paper.type,
        year: paper.year,
        title: paper.title,
        pdfUrl: paper.pdfUrl,
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load form data.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (
      form.scope === TEST_PAPER_SCOPES.FULL_SYLLABUS &&
      form.chapterId
    ) {
      setForm((prev) => ({
        ...prev,
        chapterId: "",
      }));
    }
  }, [form.chapterId, form.scope]);

  const validateForm = () => {
    const nextErrors = {};

    if (!form.subjectId) {
      nextErrors.subjectId = "Subject is required.";
    }

    if (form.scope === TEST_PAPER_SCOPES.CHAPTER_WISE && !form.chapterId) {
      nextErrors.chapterId = "Chapter is required for chapter wise papers.";
    }

    if (!form.title || String(form.title).trim().length < 5) {
      nextErrors.title = "Title must contain at least 5 characters.";
    }

    const year = Number(form.year);
    const current = new Date().getFullYear();
    if (!Number.isFinite(year) || year < 1990 || year > current + 1) {
      nextErrors.year = `Year must be between 1990 and ${current + 1}.`;
    }

    try {
      const parsed = new URL(form.pdfUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        nextErrors.pdfUrl = "PDF URL should start with http:// or https://.";
      }
    } catch {
      nextErrors.pdfUrl = "Enter a valid PDF URL.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        await testPaperService.updatePaper(id, form);
      } else {
        await testPaperService.createPaper(form);
      }

      pushToast({
        title: isEditMode ? "Paper updated" : "Paper created",
        message: "Changes are now visible in the student module.",
        tone: "success",
      });

      navigate(ROUTES.admin.testPapers);
    } catch (saveError) {
      pushToast({
        title: "Save failed",
        message: saveError.message || "Could not save paper.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="tp-admin-page">
        <div className="tp-admin-loading-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={`form-loader-${index}`} className="tp-admin-loading-bar" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="tp-admin-page">
      <header className="tp-admin-hero">
        <div>
          <p>Exam Vault Admin</p>
          <h1>{isEditMode ? "Edit Test Paper" : "Add Test Paper"}</h1>
          <span>Map paper metadata for student-ready discovery.</span>
        </div>

        <Link to={ROUTES.admin.testPapers} className="tp-admin-hero__ghost">
          Back to list
        </Link>
      </header>

      {error ? <p className="tp-admin-error">{error}</p> : null}

      <form className="tp-admin-form" onSubmit={handleSubmit} noValidate>
        <label>
          <span>Subject</span>
          <select
            value={form.subjectId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, subjectId: event.target.value, chapterId: "" }))
            }
          >
            <option value="">Select subject</option>
            {options.subjects.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
          {errors.subjectId ? <small>{errors.subjectId}</small> : null}
        </label>

        <label>
          <span>Scope</span>
          <select
            value={form.scope}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                scope: event.target.value,
                chapterId:
                  event.target.value === TEST_PAPER_SCOPES.FULL_SYLLABUS ? "" : prev.chapterId,
              }))
            }
          >
            {TEST_PAPER_SCOPE_OPTIONS.map((scopeOption) => (
              <option key={scopeOption.value} value={scopeOption.value}>
                {scopeOption.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Chapter</span>
          <select
            value={form.chapterId}
            disabled={form.scope === TEST_PAPER_SCOPES.FULL_SYLLABUS}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, chapterId: event.target.value }))
            }
          >
            <option value="">Select chapter</option>
            {chapterOptions.map((chapter) => (
              <option key={chapter.value} value={chapter.value}>
                {chapter.label}
              </option>
            ))}
          </select>
          {errors.chapterId ? <small>{errors.chapterId}</small> : null}
        </label>

        <label>
          <span>Paper Type</span>
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            {TEST_PAPER_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption.value} value={typeOption.value}>
                {typeOption.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Year</span>
          <input
            type="number"
            min="1990"
            max={String(new Date().getFullYear() + 1)}
            value={form.year}
            onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
          />
          {errors.year ? <small>{errors.year}</small> : null}
        </label>

        <label className="tp-admin-form__full">
          <span>Paper Title</span>
          <input
            type="text"
            value={form.title}
            placeholder="Enter student-facing paper title"
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          {errors.title ? <small>{errors.title}</small> : null}
        </label>

        <label className="tp-admin-form__full">
          <span>PDF URL</span>
          <input
            type="url"
            value={form.pdfUrl}
            placeholder="https://example.com/paper.pdf"
            onChange={(event) => setForm((prev) => ({ ...prev, pdfUrl: event.target.value }))}
          />
          {errors.pdfUrl ? <small>{errors.pdfUrl}</small> : null}
        </label>

        <div className="tp-admin-form__actions">
          <Link to={ROUTES.admin.testPapers}>Cancel</Link>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : isEditMode ? "Update Paper" : "Create Paper"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default AddEditTestPaperForm;
