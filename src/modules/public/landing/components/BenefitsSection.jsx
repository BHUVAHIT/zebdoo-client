import SectionHeader from "./SectionHeader";
import { benefits } from "../landingData";

const BenefitsSection = () => {
  return (
    <section className="landing-section" id="about">
      <div className="landing-container landing-benefits-grid">
        <div>
          <SectionHeader
            centered={false}
            eyebrow="Why Zebdoo"
            title="Built for Real CA Outcomes"
            description="Zebdoo combines structured learning with exam-style practice so every session directly supports your final score."
          />

          <ul className="landing-benefits-list" aria-label="Benefits of Zebdoo">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <aside className="landing-benefit-panel" aria-label="Exam readiness snapshot">
          <h3>Exam Focus Dashboard</h3>
          <p>
            Recommended next action: Complete Taxation chapter-level medium test to improve speed and
            reduce negative marking.
          </p>
          <div className="landing-benefit-panel__meta">
            <span>Expected time</span>
            <strong>22 minutes</strong>
          </div>
          <div className="landing-benefit-panel__meta">
            <span>Target score</span>
            <strong>24 / 30</strong>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default BenefitsSection;
