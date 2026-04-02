import { Link } from "react-router-dom";
import { ROUTES } from "../../../../routes/routePaths";

const CtaSection = () => {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <article className="landing-cta-card">
          <p className="landing-cta-card__eyebrow">Ready to Begin?</p>
          <h2>Start Your CA Journey Today</h2>
          <p>
            Build consistency, practice smarter, and walk into your CA exam with confidence.
          </p>
          <div className="landing-cta-card__actions">
            <Link className="landing-btn landing-btn--primary" to={ROUTES.auth.register}>
              Get Started
            </Link>
            <Link className="landing-btn landing-btn--ghost" to={ROUTES.auth.login}>
              Login
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
};

export default CtaSection;
