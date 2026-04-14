import { RotateCcw, Search } from "lucide-react";
import {
  TEST_PAPER_SCOPE_OPTIONS,
  TEST_PAPER_TYPE_OPTIONS,
  TEST_PAPER_TYPES,
} from "../../constants/paperTypes";

const TYPE_TABS = Object.freeze([
  { value: "", label: "ALL" },
  ...TEST_PAPER_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
]);

const FilterBar = ({ filters, subjects = [], years = [], onChange, onReset }) => {
  return (
    <section
      className="tp-admin-theme rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_20px_36px_-32px_rgba(15,23,42,0.55)] sm:p-5"
      aria-label="Paper filters"
    >
      <div className="grid gap-4">
        <label className="space-y-2" htmlFor="paper-search">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Search</span>
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-3 transition-colors duration-200 focus-within:border-[#4f46e5] focus-within:ring-4 focus-within:ring-[#4f46e533]">
            <Search size={16} aria-hidden="true" className="text-[#64748b]" />
            <input
              id="paper-search"
              type="search"
              className="w-full border-0 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
              placeholder="Search by title, subject, or chapter"
              value={filters.search}
              onChange={(event) => onChange?.({ search: event.target.value })}
            />
          </div>
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-2" htmlFor="paper-filter-subject">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Subject</span>
            <select
              id="paper-filter-subject"
              className="min-h-11 w-full rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition-colors duration-200 focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e533]"
              value={filters.subjectId}
              onChange={(event) => onChange?.({ subjectId: event.target.value })}
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2" htmlFor="paper-filter-mode">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Mode</span>
            <select
              id="paper-filter-mode"
              className="min-h-11 w-full rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition-colors duration-200 focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e533]"
              value={filters.scope}
              onChange={(event) => onChange?.({ scope: event.target.value })}
            >
              <option value="">All modes</option>
              {TEST_PAPER_SCOPE_OPTIONS.map((scopeOption) => (
                <option key={scopeOption.value} value={scopeOption.value}>
                  {scopeOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2" htmlFor="paper-filter-year">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Year</span>
            <select
              id="paper-filter-year"
              className="min-h-11 w-full rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition-colors duration-200 focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e533]"
              value={filters.year}
              onChange={(event) => onChange?.({ year: event.target.value })}
              disabled={filters.paperType !== TEST_PAPER_TYPES.PYC}
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Paper type filters">
            {TYPE_TABS.map((tab) => {
              const isActive = filters.paperType === tab.value;

              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
                    isActive
                      ? "border-[#4f46e5] bg-[#eef2ff] text-[#3730a3]"
                      : "border-[#d1d5db] bg-white text-[#475569] hover:-translate-y-0.5 hover:border-[#a5b4fc]"
                  }`}
                  onClick={() =>
                    onChange?.({
                      paperType: tab.value,
                      year: tab.value === TEST_PAPER_TYPES.PYC ? filters.year : "",
                    })
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#334155] transition-colors duration-200 hover:bg-[#f8fafc] lg:w-auto"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
