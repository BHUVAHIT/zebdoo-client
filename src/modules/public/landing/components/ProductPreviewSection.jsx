import SectionHeader from "./SectionHeader";
import { subjectPreview, testPreview } from "../landingData";

const ProductPreviewSection = () => {
  return (
    <section className="landing-section" id="preview">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Product Preview"
          title="A Real Glimpse of the Learning Experience"
          description="Explore how subject selection and test attempt screens look before you sign up."
        />

        <div className="landing-preview-grid">
          <article className="landing-preview-card" aria-label="Subject selection preview">
            <header>
              <h3>Subject Selection</h3>
              <span>Live Progress</span>
            </header>

            <ul className="landing-subject-list">
              {subjectPreview.map((subject) => (
                <li key={subject.code}>
                  <div>
                    <strong>{subject.name}</strong>
                    <span>{subject.code}</span>
                  </div>
                  <div className="landing-progress-track" aria-hidden="true">
                    <span style={{ width: `${subject.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="landing-preview-card" aria-label="Test interface preview">
            <header>
              <h3>{testPreview.title}</h3>
              <span>{testPreview.difficulty}</span>
            </header>

            <div className="landing-test-meta">
              <p>
                Question {testPreview.currentQuestion} of {testPreview.totalQuestions}
              </p>
              <strong>{testPreview.timer}</strong>
            </div>

            <p className="landing-test-question">{testPreview.question}</p>

            <ul className="landing-test-options">
              {testPreview.options.map((option, index) => (
                <li key={option} className={index === testPreview.activeOption ? "is-active" : ""}>
                  {option}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};

export default ProductPreviewSection;
