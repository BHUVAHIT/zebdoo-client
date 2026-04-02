const RouteLoadingScreen = ({ label = "Loading workspace..." }) => (
  <div className="route-loading-screen" role="status" aria-live="polite">
    <span className="route-loading-screen__spinner" aria-hidden="true" />
    <p>{label}</p>
  </div>
);

export default RouteLoadingScreen;
