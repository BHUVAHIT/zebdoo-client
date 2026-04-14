import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SuperAdminLayout from "../components/SuperAdminLayout";
import { requestSuperAdminMetricsRefresh } from "../components/metricsRefreshChannel";
import { ROUTES } from "../../../routes/routePaths";
import RouteLoadingScreen from "../../../components/RouteLoadingScreen";
import "../superAdmin.css";

const SuperAdminMetricsRail = lazy(() => import("../components/SuperAdminMetricsRail"));
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
const AdminCommunityOverviewPage = lazy(() =>
  import("../../community/pages/AdminCommunityOverviewPage")
);
const AdminCommunityAnnouncementsPage = lazy(() =>
  import("../../community/pages/AdminCommunityAnnouncementsPage")
);
const AdminCommunityModerationPage = lazy(() =>
  import("../../community/pages/AdminCommunityModerationPage")
);

const SuperAdminApp = () => {
  return (
    <SuperAdminLayout>
      <Suspense fallback={<div className="sa-stats-panel" aria-hidden="true" />}>
        <SuperAdminMetricsRail />
      </Suspense>

      <Suspense
        fallback={
          <RouteLoadingScreen
            label="Loading super admin workspace..."
            hint="Preparing dashboards, tables, and management tools."
          />
        }
      >
        <Routes>
          <Route index element={<Navigate to={ROUTES.admin.dashboard} replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="qa-checklist" element={<AdminQaChecklistPage />} />
          <Route
            path="students"
            element={<StudentsManagementPage onDataChange={requestSuperAdminMetricsRefresh} />}
          />
          <Route
            path="subjects"
            element={<SubjectsManagementPage onDataChange={requestSuperAdminMetricsRefresh} />}
          />
          <Route
            path="chapters"
            element={<ChaptersManagementPage onDataChange={requestSuperAdminMetricsRefresh} />}
          />
          <Route
            path="tests"
            element={<TestsManagementPage onDataChange={requestSuperAdminMetricsRefresh} />}
          />
          <Route path="test-papers" element={<ManageTestPapersPage />} />
          <Route path="test-papers/create" element={<AddEditTestPaperForm />} />
          <Route path="test-papers/edit/:id" element={<AddEditTestPaperForm />} />
          <Route path="community" element={<AdminCommunityOverviewPage />} />
          <Route path="community/announcements" element={<AdminCommunityAnnouncementsPage />} />
          <Route path="community/moderation" element={<AdminCommunityModerationPage />} />
          <Route
            path="questions"
            element={<QuestionsManagementPage onDataChange={requestSuperAdminMetricsRefresh} />}
          />
          <Route path="*" element={<Navigate to={ROUTES.admin.dashboard} replace />} />
        </Routes>
      </Suspense>
    </SuperAdminLayout>
  );
};

export default SuperAdminApp;
