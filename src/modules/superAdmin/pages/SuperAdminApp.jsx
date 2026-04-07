import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Users, BookOpen, Layers, FileText, HelpCircle } from "lucide-react";
import SuperAdminLayout from "../components/SuperAdminLayout";
import DashboardStats from "../components/DashboardStats";
import { adminDashboardService } from "../../shared/services/adminDashboard.service";
import { ROUTES } from "../../../routes/routePaths";
import "../superAdmin.css";

const AdminDashboardPage = lazy(() => import("../../admin/dashboard/pages/AdminDashboardPage"));
const AdminQaChecklistPage = lazy(() =>
  import("../../admin/dashboard/pages/AdminQaChecklistPage")
);
const StudentsManagementPage = lazy(() =>
  import("../../admin/management/pages/StudentsManagementPage")
);
const SubjectsManagementPage = lazy(() =>
  import("../../admin/management/pages/SubjectsManagementPage")
);
const ChaptersManagementPage = lazy(() =>
  import("../../admin/management/pages/ChaptersManagementPage")
);
const TestsManagementPage = lazy(() =>
  import("../../admin/management/pages/TestsManagementPage")
);
const QuestionsManagementPage = lazy(() =>
  import("../../admin/management/pages/QuestionsManagementPage")
);
const ManageTestPapersPage = lazy(() => import("../../../admin-pages/ManageTestPapersPage"));
const AddEditTestPaperForm = lazy(() => import("../../../admin-pages/AddEditTestPaperForm"));

const SuperAdminApp = () => {
  const [metrics, setMetrics] = useState({
    students: 0,
    subjects: 0,
    chapters: 0,
    tests: 0,
    questions: 0,
  });

  const refreshMetrics = useCallback(async () => {
    const next = await adminDashboardService.getMetrics();
    setMetrics(next);
  }, []);

  useEffect(() => {
    let active = true;

    adminDashboardService.getMetrics().then((next) => {
      if (active) {
        setMetrics(next);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const metricConfig = [
    { label: "Students", key: "students", icon: Users, color: "bg-slate-50" },
    { label: "Subjects", key: "subjects", icon: BookOpen, color: "bg-teal-50" },
    { label: "Chapters", key: "chapters", icon: Layers, color: "bg-emerald-50" },
    { label: "Tests", key: "tests", icon: FileText, color: "bg-cyan-50" },
    { label: "Questions", key: "questions", icon: HelpCircle, color: "bg-slate-100" },
  ];

  return (
    <SuperAdminLayout>
      <DashboardStats metrics={metrics} metricConfig={metricConfig} />

      <Suspense fallback={<p className="text-center py-8 text-slate-500">Loading super admin workspace...</p>}>
        <Routes>
          <Route index element={<Navigate to={ROUTES.admin.dashboard} replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="qa-checklist" element={<AdminQaChecklistPage />} />
          <Route
            path="students"
            element={<StudentsManagementPage onDataChange={refreshMetrics} />}
          />
          <Route
            path="subjects"
            element={<SubjectsManagementPage onDataChange={refreshMetrics} />}
          />
          <Route
            path="chapters"
            element={<ChaptersManagementPage onDataChange={refreshMetrics} />}
          />
          <Route path="tests" element={<TestsManagementPage onDataChange={refreshMetrics} />} />
          <Route path="test-papers" element={<ManageTestPapersPage />} />
          <Route path="test-papers/create" element={<AddEditTestPaperForm />} />
          <Route path="test-papers/edit/:id" element={<AddEditTestPaperForm />} />
          <Route
            path="questions"
            element={<QuestionsManagementPage onDataChange={refreshMetrics} />}
          />
          <Route path="*" element={<Navigate to={ROUTES.admin.dashboard} replace />} />
        </Routes>
      </Suspense>
    </SuperAdminLayout>
  );
};

export default SuperAdminApp;
