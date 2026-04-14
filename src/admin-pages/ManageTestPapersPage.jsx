import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import FilterBar from "./components/FilterBar";
import PaperTable from "./components/PaperTable";
import ConfirmDialog from "../modules/superAdmin/components/ConfirmDialog";
import { TEST_PAPER_TYPES } from "../constants/paperTypes";
import { ROUTES } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import { useAppToast } from "../components/notifications/useAppToast";
import { PageHeader } from "./components/AdminUiKit";
import "./testPaperAdmin.css";

const initialFilters = {
  search: "",
  subjectId: "",
  scope: "",
  paperType: "",
  year: "",
};

const PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50]);

const ManageTestPapersPage = () => {
  const { pushToast } = useAppToast();
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filters, setFilters] = useState(initialFilters);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [formOptions, setFormOptions] = useState({
    subjects: [],
  });

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const [papersResponse, optionsResponse] = await Promise.all([
        testPaperService.listPapersForAdmin({
          search: filters.search,
          subjectId: filters.subjectId,
          scope: filters.scope,
          paperType: filters.paperType,
          year: filters.year,
        }),
        testPaperService.getFormOptions(),
      ]);

      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      setItems(papersResponse.items || []);
      setFormOptions({ subjects: optionsResponse.subjects || [] });
    } catch (loadError) {
      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      setError(loadError.message || "Unable to load test papers.");
    } finally {
      if (isMountedRef.current && requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      loadRequestIdRef.current += 1;
    };
  }, []);

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
    const years = new Set(
      items
        .filter((item) => (item.paperType || item.type) === TEST_PAPER_TYPES.PYC)
        .map((item) => String(item.year))
        .filter(Boolean)
    );
    return [...years].sort((left, right) => Number(right) - Number(left));
  }, [items]);

  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const handleDelete = async () => {
    if (!deleteTarget?.id || deleteBusy) return;

    setDeleteBusy(true);

    try {
      await testPaperService.deletePaper(deleteTarget.id);
      pushToast({
        title: "Paper deleted",
        message: "The paper has been removed from student and admin views.",
        tone: "success",
      });
      setDeleteTarget(null);
      loadData();
    } catch (deleteError) {
      pushToast({
        title: "Delete failed",
        message: deleteError.message || "Could not delete paper.",
        tone: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleFilterChange = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  };

  return (
    <section className="tp-admin-theme tp-admin-page space-y-5 pb-10">
      <PageHeader
        title="Manage Test Papers"
        subtitle="Search, filter, and maintain PYC, MTP, RTP, and other student-visible paper sets."
        action={
          <Link
            to={ROUTES.admin.testPapersCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(79,70,229,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4338ca]"
          >
            <Plus size={16} />
            <span>Add Paper</span>
          </Link>
        }
      />

      <FilterBar
        filters={filters}
        subjects={formOptions.subjects}
        years={uniqueYears}
        onChange={handleFilterChange}
        onReset={() => {
          setFilters(initialFilters);
          setPage(1);
        }}
      />

      {error ? <p className="tp-admin-error">{error}</p> : null}

      <PaperTable
        loading={loading}
        items={pagedItems}
        totalItems={totalItems}
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onViewPaper={(item) => {
          if (!item?.pdfUrl || typeof window === "undefined") return;
          window.open(item.pdfUrl, "_blank", "noopener,noreferrer");
        }}
        onRequestDelete={setDeleteTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Test Paper"
        message={`Delete paper "${deleteTarget?.title || "this paper"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        busy={deleteBusy}
      />
    </section>
  );
};

export default ManageTestPapersPage;
