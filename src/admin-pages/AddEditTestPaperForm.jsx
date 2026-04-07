import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  TEST_PAPER_SCOPES,
  TEST_PAPER_TYPES,
  normalizePaperType,
} from "../constants/paperTypes";
import { ROUTES } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import { useAppToast } from "../components/notifications/useAppToast";
import { PageHeader } from "./components/AdminUiKit";
import PaperForm from "./components/PaperForm";
import "./testPaperAdmin.css";

const getDefaultYear = () => new Date().getFullYear();

const createInitialState = () => ({
  subjectId: "",
  chapterId: "",
  scope: TEST_PAPER_SCOPES.CHAPTER_WISE,
  paperType: TEST_PAPER_TYPES.PYC,
  year: getDefaultYear(),
  title: "",
  pdfUrl: "",
  pdfFileName: "",
  pdfFileSize: 0,
  pdfMimeType: "application/pdf",
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
        paperType: normalizePaperType(paper.paperType || paper.type),
        year: paper.year || getDefaultYear(),
        title: paper.title,
        pdfUrl: paper.pdfUrl,
        pdfFileName: paper.pdfFileName || "",
        pdfFileSize: paper.pdfFileSize || 0,
        pdfMimeType: paper.pdfMimeType || "application/pdf",
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

  useEffect(() => {
    if (form.paperType !== TEST_PAPER_TYPES.PYC && !form.year) {
      setForm((prev) => ({
        ...prev,
        year: getDefaultYear(),
      }));
    }
  }, [form.paperType, form.year]);

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

    if (form.paperType === TEST_PAPER_TYPES.PYC) {
      const year = Number(form.year);
      const current = new Date().getFullYear();
      if (!Number.isFinite(year) || year < 1990 || year > current + 1) {
        nextErrors.year = `Year must be between 1990 and ${current + 1}.`;
      }
    }

    if (!form.pdfUrl) {
      nextErrors.pdfUrl = "Please upload a PDF file.";
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
      const payload = {
        subjectId: form.subjectId,
        chapterId: form.chapterId,
        scope: form.scope,
        paperType: form.paperType,
        type: form.paperType,
        year: form.paperType === TEST_PAPER_TYPES.PYC ? Number(form.year) : Number(form.year || getDefaultYear()),
        title: form.title,
        pdfUrl: form.pdfUrl,
        pdfFileName: form.pdfFileName,
        pdfFileSize: form.pdfFileSize,
        pdfMimeType: form.pdfMimeType,
      };

      if (isEditMode) {
        await testPaperService.updatePaper(id, payload);
      } else {
        await testPaperService.createPaper(payload);
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
      <section className="tp-admin-theme tp-admin-page space-y-5">
        <PageHeader
          title={isEditMode ? "Edit Test Paper" : "Create Test Paper"}
          subtitle="Upload and manage student test papers"
          backTo={ROUTES.admin.testPapers}
          backLabel="Back"
        />

        <div className="grid gap-3 rounded-3xl border border-[#e5e7eb] bg-[#f8fafc] p-4 sm:p-6">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={`form-loader-${index}`} className="tp-admin-loading-bar h-12" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="tp-admin-theme tp-admin-page space-y-5 pb-10">
      <PageHeader
        title={isEditMode ? "Edit Test Paper" : "Create Test Paper"}
        subtitle="Upload and manage student test papers"
        backTo={ROUTES.admin.testPapers}
        backLabel="Back"
      />

      {error ? <p className="tp-admin-error">{error}</p> : null}

      <PaperForm
        isEditMode={isEditMode}
        form={form}
        errors={errors}
        subjects={options.subjects}
        chapterOptions={chapterOptions}
        submitting={submitting}
        onPatch={(patch) => {
          setForm((prev) => ({ ...prev, ...patch }));
          setErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch || {}).forEach((key) => {
              delete next[key];
            });
            return next;
          });
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(ROUTES.admin.testPapers)}
        onUploadFile={async (file, uploadOptions) => {
          const uploaded = await testPaperService.uploadPaperFile(file, uploadOptions);
          pushToast({
            title: "PDF uploaded",
            message: "Your file is ready and linked to this paper.",
            tone: "success",
          });
          return uploaded;
        }}
      />
    </section>
  );
};

export default AddEditTestPaperForm;
