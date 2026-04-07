import { PageContentSkeleton } from "./loading/LoadingPrimitives";

const RouteLoadingScreen = ({
  label = "Loading workspace...",
  hint = "Preparing your session with the latest data.",
}) => <PageContentSkeleton title={label} description={hint} />;

export default RouteLoadingScreen;
