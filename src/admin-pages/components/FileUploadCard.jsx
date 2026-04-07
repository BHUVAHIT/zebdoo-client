import { useMemo, useRef, useState } from "react";
import {
  FileText,
  LoaderCircle,
  Trash2,
  UploadCloud,
  RefreshCcw,
} from "lucide-react";

const toFileSizeLabel = (sizeInBytes) => {
  const bytes = Number(sizeInBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const FileUploadCard = ({ value, disabled = false, onUploadFile, onUploaded, onClear }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState(value?.url ? "success" : "idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const fileMeta = useMemo(() => {
    if (!value?.url) return null;
    return {
      fileName: value.fileName || "Uploaded paper.pdf",
      fileSize: toFileSizeLabel(value.fileSize),
    };
  }, [value]);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleUpload = async (nextFile) => {
    if (!nextFile || disabled) return;

    const isPdf =
      String(nextFile.type || "").toLowerCase() === "application/pdf" ||
      String(nextFile.name || "").toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setStatus("error");
      setError("Only PDF files are allowed.");
      return;
    }

    if (typeof onUploadFile !== "function") {
      setStatus("error");
      setError("Upload service is unavailable.");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setError("");

    try {
      const uploaded = await onUploadFile(nextFile, {
        onProgress: (nextProgress) => {
          const safeProgress = Math.max(0, Math.min(Number(nextProgress) || 0, 100));
          setProgress(safeProgress);
        },
      });

      onUploaded?.(uploaded);
      setStatus("success");
      setProgress(100);
    } catch (uploadError) {
      setStatus("error");
      setError(uploadError?.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          handleUpload(nextFile);
          event.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        className={`group rounded-2xl border-2 border-dashed bg-gradient-to-br from-[#f8fafc] to-[#eef2ff] p-6 transition-all duration-300 ${
          dragActive
            ? "border-[#4f46e5] shadow-[0_18px_34px_-30px_rgba(79,70,229,0.75)]"
            : "border-[#cbd5e1] hover:-translate-y-0.5 hover:border-[#818cf8]"
        } ${status === "error" ? "border-[#fca5a5] bg-[#fff7f7]" : ""}`}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
          const nextFile = event.dataTransfer.files?.[0];
          handleUpload(nextFile);
        }}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-3 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c7d2fe] bg-white text-[#4f46e5] shadow-sm">
            {status === "uploading" ? (
              <LoaderCircle size={22} className="animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud size={22} aria-hidden="true" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#111827]">Drag and drop PDF or click to upload</p>
            <p className="mt-1 text-xs text-[#64748b]">Single PDF file only. Recommended size under 15 MB.</p>
          </div>
        </div>
      </div>

      {status === "uploading" ? (
        <div className="overflow-hidden rounded-full border border-[#dbe3f4] bg-[#eef2ff]" aria-live="polite">
          <div
            className="flex h-7 items-center bg-gradient-to-r from-[#4f46e5] to-[#6366f1] px-3 text-xs font-semibold text-white transition-all duration-200"
            style={{ width: `${progress}%` }}
          >
            {progress}%
          </div>
        </div>
      ) : null}

      {fileMeta ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <FileText size={15} aria-hidden="true" />
              <span>{fileMeta.fileName}</span>
            </p>
            <p className="text-xs font-medium text-[#64748b]">{fileMeta.fileSize}</p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || status === "uploading"}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#334155] transition-colors duration-200 hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              <RefreshCcw size={14} aria-hidden="true" />
              <span>Replace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (status === "uploading") return;
                setStatus("idle");
                setProgress(0);
                setError("");
                onClear?.();
              }}
              disabled={disabled || status === "uploading"}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-3 py-2 text-xs font-semibold text-[#b91c1c] transition-colors duration-200 hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : null}

      {status === "success" ? <p className="text-xs font-semibold text-[#166534]">PDF uploaded successfully.</p> : null}
      {error ? <p className="text-xs font-semibold text-[#dc2626]">{error}</p> : null}
    </div>
  );
};

export default FileUploadCard;
