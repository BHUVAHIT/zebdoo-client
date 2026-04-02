import SectionHeader from "./SectionHeader";
import { testimonialItems } from "../landingData";

const TestimonialsSection = () => {
  return (
    <section className="landing-section landing-section--tint" id="testimonials">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Student Stories"
          title="Trusted by Ambitious CA Aspirants"
          description="Learners use Zebdoo daily to stay consistent, score higher, and prepare with confidence."
        />

        <div className="landing-testimonial-grid">
          {testimonialItems.map((item) => (
            <article className="landing-testimonial-card" key={item.id}>
              <p className="landing-testimonial-card__quote">&ldquo;{item.quote}&rdquo;</p>
              <div className="landing-testimonial-card__author">
                <strong>{item.name}</strong>
                <span>{item.meta}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
