import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getDefaultAppRoute, ROUTES } from "../../routes/routePaths";

const NotFoundPage = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const homeTarget = isAuthenticated ? getDefaultAppRoute(user?.role) : ROUTES.home;

  return (
    <main className="not-found-page">
      <section className="not-found-page__card">
        <p className="not-found-page__kicker">404</p>
        <h1>Page not found</h1>
        <p>The route you entered does not exist or may have moved to a new location.</p>

        <div className="not-found-page__actions">
          <Link className="btn-primary" to={homeTarget}>
            Go to Workspace
          </Link>
          <Link className="btn-secondary" to={ROUTES.home}>
            Open Public Home
          </Link>
        </div>
      </section>
    </main>
  );
};

export default NotFoundPage;
