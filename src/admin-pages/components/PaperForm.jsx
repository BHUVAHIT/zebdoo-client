import { TEST_PAPER_SCOPES, TEST_PAPER_TYPES } from "../../constants/paperTypes";
import {
  ActionBar,
  FormSection,
  InputField,
  SelectField,
  ToggleTabs,
} from "./AdminUiKit";
import FileUploadCard from "./FileUploadCard";

const PaperForm = ({
  isEditMode,
  form,
  errors,
  subjects,
  chapterOptions,
  submitting,
  onPatch,
  onSubmit,
  onCancel,
  onUploadFile,
}) => {
  const currentYear = new Date().getFullYear();
  const scopeOptions = [
    { value: TEST_PAPER_SCOPES.CHAPTER_WISE, label: "Chapter-wise" },
    { value: TEST_PAPER_SCOPES.FULL_SYLLABUS, label: "Full Syllabus" },
  ];
  const typeOptions = [
    { value: TEST_PAPER_TYPES.PYC, label: "PYC" },
    { value: TEST_PAPER_TYPES.MTP, label: "MTP" },
    { value: TEST_PAPER_TYPES.RTP, label: "RTP" },
    { value: TEST_PAPER_TYPES.OTHER, label: "OTHER" },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="tp-admin-theme space-y-5">
      <div className="space-y-5 rounded-3xl border border-[#e5e7eb] bg-[#f8fafc] p-4 sm:p-6">
        <FormSection
          title="Basic Info"
          description="Add a clear student-facing title so papers are discoverable in the learning module."
        >
          <div className="grid grid-cols-1 gap-4">
            <InputField
              id="paper-title"
              label="Title"
              required
              value={form.title}
              placeholder="Enter student-facing paper title"
              onChange={(event) => onPatch({ title: event.target.value })}
              error={errors.title}
            />
          </div>
        </FormSection>

        <FormSection
          title="Classification"
          description="Map subject and paper type carefully to maintain consistent student filters."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              id="paper-subject"
              label="Subject"
              required
              value={form.subjectId}
              onChange={(event) =>
                onPatch({
                  subjectId: event.target.value,
                  chapterId: "",
                })
              }
              error={errors.subjectId}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </SelectField>

            <div className="md:col-span-1">
              <ToggleTabs
                legend="Mode"
                name="scope"
                value={form.scope}
                segmented
                options={scopeOptions}
                onChange={(scopeValue) =>
                  onPatch({
                    scope: scopeValue,
                    ...(scopeValue === TEST_PAPER_SCOPES.FULL_SYLLABUS ? { chapterId: "" } : {}),
                  })
                }
              />
            </div>

            {form.scope === TEST_PAPER_SCOPES.CHAPTER_WISE ? (
              <SelectField
                id="paper-chapter"
                label="Chapter"
                required
                value={form.chapterId}
                onChange={(event) => onPatch({ chapterId: event.target.value })}
                error={errors.chapterId}
              >
                <option value="">Select chapter</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.value} value={chapter.value}>
                    {chapter.label}
                  </option>
                ))}
              </SelectField>
            ) : (
              <InputField id="paper-chapter" label="Chapter" value="Full Syllabus" disabled readOnly />
            )}

            {form.paperType === TEST_PAPER_TYPES.PYC ? (
              <InputField
                id="paper-year"
                label="Year"
                required
                type="number"
                min="1990"
                max={String(currentYear + 1)}
                value={form.year}
                onChange={(event) => onPatch({ year: event.target.value })}
                error={errors.year}
              />
            ) : (
              <div className="hidden md:block" aria-hidden="true" />
            )}

            <div className="md:col-span-2">
              <ToggleTabs
                legend="Paper Type"
                name="paperType"
                value={form.paperType}
                options={typeOptions}
                onChange={(paperType) => onPatch({ paperType })}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="File Upload"
          description="Upload PDF paper files with drag and drop. Replace or remove any uploaded file anytime."
        >
          <div className="space-y-3">
            <FileUploadCard
              value={{
                url: form.pdfUrl,
                fileName: form.pdfFileName,
                fileSize: form.pdfFileSize,
              }}
              disabled={submitting}
              onUploadFile={onUploadFile}
              onUploaded={(uploaded) =>
                onPatch({
                  pdfUrl: uploaded.url,
                  pdfFileName: uploaded.fileName,
                  pdfFileSize: uploaded.fileSize,
                  pdfMimeType: uploaded.mimeType,
                })
              }
              onClear={() =>
                onPatch({
                  pdfUrl: "",
                  pdfFileName: "",
                  pdfFileSize: 0,
                  pdfMimeType: "",
                })
              }
            />
            {errors.pdfUrl ? <p className="text-xs font-semibold text-[#dc2626]">{errors.pdfUrl}</p> : null}
          </div>
        </FormSection>
      </div>

      <ActionBar
        busy={submitting}
        onCancel={onCancel}
        saveLabel={isEditMode ? "Save Paper" : "Save Paper"}
      />
    </form>
  );
};

export default PaperForm;
