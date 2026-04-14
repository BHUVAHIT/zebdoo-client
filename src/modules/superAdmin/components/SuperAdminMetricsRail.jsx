import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileText, HelpCircle, Layers, Users } from "lucide-react";
import DashboardStats from "./DashboardStats";
import { adminDashboardService } from "../../shared/services/adminDashboard.service";
import { subscribeSuperAdminMetricsRefresh } from "./metricsRefreshChannel";

const METRIC_CONFIG = Object.freeze([
  { label: "Students", key: "students", icon: Users, color: "bg-slate-50" },
  { label: "Subjects", key: "subjects", icon: BookOpen, color: "bg-teal-50" },
  { label: "Chapters", key: "chapters", icon: Layers, color: "bg-emerald-50" },
  { label: "Tests", key: "tests", icon: FileText, color: "bg-cyan-50" },
  { label: "Questions", key: "questions", icon: HelpCircle, color: "bg-slate-100" },
]);

const INITIAL_METRICS = Object.freeze({
  students: 0,
  subjects: 0,
  chapters: 0,
  tests: 0,
  questions: 0,
});

const SuperAdminMetricsRail = () => {
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadMetrics = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setMetricsLoading(true);

    try {
      const next = await adminDashboardService.getMetrics();

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setMetrics(next || INITIAL_METRICS);
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setMetricsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadMetrics();

    const unsubscribe = subscribeSuperAdminMetricsRefresh(() => {
      loadMetrics();
    });

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      unsubscribe?.();
    };
  }, [loadMetrics]);

  const metricConfig = useMemo(() => METRIC_CONFIG, []);

  return <DashboardStats loading={metricsLoading} metrics={metrics} metricConfig={metricConfig} />;
};

export default SuperAdminMetricsRail;
