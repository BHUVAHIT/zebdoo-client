import SectionHeader from "./SectionHeader";
import { workflowSteps } from "../landingData";

const HowItWorksSection = () => {
  return (
    <section className="landing-section landing-section--flow" id="how-it-works">
      <div className="landing-container">
        <SectionHeader
          eyebrow="How It Works"
          title="From Subject to Score in Four Steps"
          description="A simple workflow that keeps preparation clear, measurable, and exam focused."
        />

        <ol className="landing-flow-grid" aria-label="Zebdoo preparation flow">
          {workflowSteps.map((step, index) => (
            <li className="landing-flow-item" key={step.id}>
              <span className="landing-flow-item__index">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorksSection;
