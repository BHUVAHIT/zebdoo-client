import { useEffect, useMemo, useRef, useState } from "react";
import ModalDrawer from "../../components/ModalDrawer";
import "./QuestionForm.css";

const DIFFICULTY_OPTIONS = [
  { label: "Easy", value: "Easy" },
  { label: "Medium", value: "Medium" },
  { label: "Hard", value: "Hard" },
];

const CORRECT_ANSWER_OPTIONS = [
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
];

const QuestionForm = ({
  open,
  isEditing,
  values,
  subjectOptions,
  chapterOptions,
  chapterDisabled,
  onChange,
  onSubmit,
  onCancel,
  submitting,
}) => {
  const shellRef = useRef(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return undefined;

    const body = shellRef.current?.closest(".sa-modal-body");
    if (!body) return undefined;

    body.classList.add("qbqf-modal-body");

    return () => {
      body.classList.remove("qbqf-modal-body");
    };
  }, [open]);

  const clearError = (fieldName) => {
    setErrors((current) => {
      if (!current[fieldName]) return current;
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const validate = useMemo(
    () => (draft) => {
      const nextErrors = {};

      if (!String(draft.subjectId || "").trim()) {
        nextErrors.subjectId = "Subject is required.";
      }

      if (!String(draft.chapterId || "").trim()) {
        nextErrors.chapterId = "Chapter is required.";
      }

      if (!String(draft.difficulty || "").trim()) {
        nextErrors.difficulty = "Difficulty is required.";
      }

      if (!String(draft.question || "").trim()) {
        nextErrors.question = "Question is required.";
      }

      ["optionA", "optionB", "optionC", "optionD"].forEach((key) => {
        if (!String(draft[key] || "").trim()) {
          nextErrors[key] = "This option is required.";
        }
      });

      if (!["A", "B", "C", "D"].includes(String(draft.correctAnswer || ""))) {
        nextErrors.correctAnswer = "Correct answer is required.";
      }

      return nextErrors;
    },
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit();
  };

  const handleCancel = () => {
    if (submitting) return;
    setErrors({});
    onCancel();
  };

  const fieldOptions = {
    difficulty: DIFFICULTY_OPTIONS,
    correct: CORRECT_ANSWER_OPTIONS,
  };

  return (
    <ModalDrawer
      open={open}
      title={isEditing ? "Edit Question" : "Add Question"}
      onClose={handleCancel}
      width="860px"
    >
      <div ref={shellRef} className="qbqf-shell">
        <form className="qbqf-form" onSubmit={handleSubmit}>
          <div className="qbqf-scroll" role="region" aria-label="Question form fields">
            <div className="qbqf-grid">
              <label className="sa-field">
                <div className="sa-field__label-row">
                  <span>Subject</span>
                  <span className="sa-field__required">*</span>
                </div>
                <select
                  className={`sa-input ${errors.subjectId ? "is-error" : ""}`.trim()}
                  value={values.subjectId}
                  onChange={(event) => {
                    onChange("subjectId", event.target.value);
                    clearError("subjectId");
                    clearError("chapterId");
                  }}
                  disabled={submitting}
                >
                  <option value="">Select Subject</option>
                  {subjectOptions.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.subjectId ? <p className="sa-field__error">{errors.subjectId}</p> : null}
              </label>

              <label className="sa-field">
                <div className="sa-field__label-row">
                  <span>Chapter</span>
                  <span className="sa-field__required">*</span>
                </div>
                <select
                  className={`sa-input ${errors.chapterId ? "is-error" : ""}`.trim()}
                  value={values.chapterId}
                  onChange={(event) => {
                    onChange("chapterId", event.target.value);
                    clearError("chapterId");
                  }}
                  disabled={chapterDisabled || submitting}
                >
                  <option value="">{chapterDisabled ? "Select Subject First" : "Select Chapter"}</option>
                  {chapterOptions.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.chapterId ? <p className="sa-field__error">{errors.chapterId}</p> : null}
              </label>

              <label className="sa-field">
                <div className="sa-field__label-row">
                  <span>Difficulty</span>
                  <span className="sa-field__required">*</span>
                </div>
                <select
                  className={`sa-input ${errors.difficulty ? "is-error" : ""}`.trim()}
                  value={values.difficulty}
                  onChange={(event) => {
                    onChange("difficulty", event.target.value);
                    clearError("difficulty");
                  }}
                  disabled={submitting}
                >
                  <option value="">Select Difficulty</option>
                  {fieldOptions.difficulty.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.difficulty ? <p className="sa-field__error">{errors.difficulty}</p> : null}
              </label>

              <label className="sa-field qbqf-span-full">
                <div className="sa-field__label-row">
                  <span>Question</span>
                  <span className="sa-field__required">*</span>
                </div>
                <textarea
                  rows={6}
                  className={`sa-input sa-input--textarea ${errors.question ? "is-error" : ""}`.trim()}
                  value={values.question}
                  onChange={(event) => {
                    onChange("question", event.target.value);
                    clearError("question");
                  }}
                  placeholder="Enter question statement"
                  disabled={submitting}
                />
                {errors.question ? <p className="sa-field__error">{errors.question}</p> : null}
              </label>

              {[
                { key: "optionA", label: "Option A" },
                { key: "optionB", label: "Option B" },
                { key: "optionC", label: "Option C" },
                { key: "optionD", label: "Option D" },
              ].map((item) => (
                <label key={item.key} className="sa-field qbqf-span-full">
                  <div className="sa-field__label-row">
                    <span>{item.label}</span>
                    <span className="sa-field__required">*</span>
                  </div>
                  <textarea
                    rows={4}
                    className={`sa-input sa-input--textarea ${errors[item.key] ? "is-error" : ""}`.trim()}
                    value={values[item.key]}
                    onChange={(event) => {
                      onChange(item.key, event.target.value);
                      clearError(item.key);
                    }}
                    placeholder={`Enter ${item.label}`}
                    disabled={submitting}
                  />
                  {errors[item.key] ? <p className="sa-field__error">{errors[item.key]}</p> : null}
                </label>
              ))}

              <label className="sa-field">
                <div className="sa-field__label-row">
                  <span>Correct Answer</span>
                  <span className="sa-field__required">*</span>
                </div>
                <select
                  className={`sa-input ${errors.correctAnswer ? "is-error" : ""}`.trim()}
                  value={values.correctAnswer}
                  onChange={(event) => {
                    onChange("correctAnswer", event.target.value);
                    clearError("correctAnswer");
                  }}
                  disabled={submitting}
                >
                  <option value="">Select Answer</option>
                  {fieldOptions.correct.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.correctAnswer ? <p className="sa-field__error">{errors.correctAnswer}</p> : null}
              </label>
            </div>
          </div>

          <div className="qbqf-footer">
            <button type="button" className="sa-btn" onClick={handleCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="sa-btn sa-btn--primary" disabled={submitting}>
              {submitting ? "Saving..." : isEditing ? "Update Question" : "Add Question"}
            </button>
          </div>
        </form>
      </div>
    </ModalDrawer>
  );
};

export default QuestionForm;
