import SectionHeader from "./SectionHeader";
import { featureItems } from "../landingData";
import { BookIcon, CheckIcon, DocumentIcon, LayersIcon, TargetIcon } from "./LandingIcons";

const iconMap = {
  book: BookIcon,
  layers: LayersIcon,
  document: DocumentIcon,
  target: TargetIcon,
  check: CheckIcon,
};

const FeaturesSection = () => {
  return (
    <section className="landing-section" id="features">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Powerful Features"
          title="Everything You Need for CA Exam Success"
          description="Designed for focused revision, higher retention, and faster confidence building."
        />

        <div className="landing-feature-grid">
          {featureItems.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <article className="landing-feature-card" key={feature.id}>
                <div className="landing-feature-card__icon" aria-hidden="true">
                  <Icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
