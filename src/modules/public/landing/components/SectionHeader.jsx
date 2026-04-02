const SectionHeader = ({ eyebrow, title, description, centered = true }) => {
  return (
    <header className={`landing-section-header ${centered ? "is-centered" : ""}`}>
      {eyebrow ? <p className="landing-section-header__eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="landing-section-header__description">{description}</p> : null}
    </header>
  );
};

export default SectionHeader;
