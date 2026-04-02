import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "../test/testFlow.css";
import { routeBuilders } from "../routes/routePaths";

const TestFlowLayout = lazy(() => import("../test/pages/TestFlowLayout"));
const SubjectSelectionPage = lazy(() => import("../test/pages/SubjectSelectionPage"));
const ChapterSelectionPage = lazy(() => import("../test/pages/ChapterSelectionPage"));
const DifficultySelectionPage = lazy(() =>
  import("../test/pages/DifficultySelectionPage")
);
const AttemptPage = lazy(() => import("../test/pages/AttemptPage"));
const PreviewPage = lazy(() => import("../test/pages/PreviewPage"));

const RouteFallback = () => (
  <div className="mcq-loading-state" role="status" aria-live="polite">
    <span className="mcq-loading-state__spinner" />
    <p>Loading test flow...</p>
  </div>
);

const TestPage = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<TestFlowLayout />}>
          <Route index element={<SubjectSelectionPage />} />
          <Route path=":subjectId/chapters" element={<ChapterSelectionPage />} />
          <Route
            path=":subjectId/:chapterId/difficulty"
            element={<DifficultySelectionPage />}
          />
          <Route
            path=":subjectId/:chapterId/:difficultyLevel/attempt"
            element={<AttemptPage />}
          />
          <Route
            path=":subjectId/:chapterId/:difficultyLevel/preview"
            element={<PreviewPage />}
          />
        </Route>
        <Route
          path="*"
          element={<Navigate to={routeBuilders.assessmentSession.root} replace />}
        />
      </Routes>
    </Suspense>
  );
};

export default TestPage;