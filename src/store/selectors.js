export const selectCatalogCounts = ({
  subjectState,
  chapterState,
  testState,
  questionState,
}) => ({
  subjects: subjectState.allIds.length,
  chapters: chapterState.allIds.length,
  tests: testState.allIds.length,
  questions: questionState.allIds.length,
});

export const selectSessionTelemetry = (state) => ({
  route: state.activeRoute,
  role: state.userRole,
  lastCatalogVersion: state.lastCatalogVersion,
  lastSyncAt: state.lastSyncAt,
  networkStatus: state.networkStatus,
});
