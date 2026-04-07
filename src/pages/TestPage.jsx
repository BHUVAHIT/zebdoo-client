import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import "../test/testFlow.css";
import { routeBuilders } from "../routes/routePaths";
import LoadingState from "../test/components/LoadingState";

const TestFlowLayout = lazy(() => import("../test/pages/TestFlowLayout"));
const SubjectSelectionPage = lazy(() => import("../test/pages/SubjectSelectionPage"));
const ChapterSelectionPage = lazy(() => import("../test/pages/ChapterSelectionPage"));
const DifficultySelectionPage = lazy(() =>
  import("../test/pages/DifficultySelectionPage")
);
const AttemptPage = lazy(() => import("../test/pages/AttemptPage"));
const PreviewPage = lazy(() => import("../test/pages/PreviewPage"));

const RouteFallback = () => <LoadingState label="Loading test flow..." />;

const SubjectAliasRedirect = () => {
  const { subjectId } = useParams();
  return <Navigate to={routeBuilders.assessmentSession.chapters(subjectId)} replace />;
};

const ChapterAliasRedirect = () => {
  const { subjectId, chapterId } = useParams();
  return (
    <Navigate
      to={routeBuilders.assessmentSession.difficulty(subjectId, chapterId)}
      replace
    />
  );
};

const TestPage = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<TestFlowLayout />}>
          <Route index element={<SubjectSelectionPage />} />
          <Route path=":subjectId" element={<SubjectAliasRedirect />} />
          <Route path=":subjectId/chapters" element={<ChapterSelectionPage />} />
          <Route path=":subjectId/:chapterId/chapters" element={<ChapterAliasRedirect />} />
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