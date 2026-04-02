import { Link } from "react-router-dom";
import { ROUTES } from "../../../../routes/routePaths";
import { landingStats } from "../landingData";
import { SparkleIcon } from "./LandingIcons";

const HeroSection = () => {
  return (
    <section className="landing-section landing-hero" id="home">
      <div className="landing-container landing-hero__grid">
        <div className="landing-hero__content">
          <p className="landing-hero__badge">Trusted by CA students across India</p>
          <h1>
            Master CA Exams with <span>Smart Preparation</span>
          </h1>
          <p className="landing-hero__subtitle">
            Study subject-wise, revise chapter-wise, solve previous year papers, and practice smart
            MCQs with exam-level explanations.
          </p>

          <div className="landing-hero__actions">
            <Link className="landing-btn landing-btn--primary" to={ROUTES.auth.register}>
              <span className="landing-btn__icon" aria-hidden="true">
                <SparkleIcon />
              </span>
              Get Started
            </Link>
            <Link className="landing-btn landing-btn--ghost" to={ROUTES.auth.login}>
              Login
            </Link>
          </div>

          <div className="landing-hero__stats" aria-label="Platform highlights">
            {landingStats.map((stat) => (
              <article key={stat.id} className="landing-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="landing-hero__visual" aria-label="Zebdoo preparation snapshot">
          <div className="landing-hero-preview">
            <header>
              <p>Today&apos;s Study Sprint</p>
              <strong>Business Laws</strong>
            </header>
            <div className="landing-hero-preview__meter" role="presentation">
              <span />
            </div>
            <ul>
              <li>
                <span>Chapter coverage</span>
                <strong>4/6</strong>
              </li>
              <li>
                <span>MCQs solved</span>
                <strong>72</strong>
              </li>
              <li>
                <span>Accuracy</span>
                <strong>84%</strong>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default HeroSection;
