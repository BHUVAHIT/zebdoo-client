const LandingFooter = () => {
  return (
    <footer className="landing-footer" id="contact">
      <div className="landing-container landing-footer__grid">
        <section>
          <h3>Zebdoo Client</h3>
          <p>
            A modern CA preparation platform for structured study, previous paper practice, and
            exam-ready MCQ training.
          </p>
        </section>

        <nav aria-label="Footer navigation">
          <h4>Quick Links</h4>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#privacy">Privacy Policy</a>
        </nav>

        <section id="privacy">
          <h4>Contact</h4>
          <p>support@zebdoo.com</p>
          <p>Mon - Sat, 9:00 AM to 7:00 PM</p>
        </section>
      </div>
      <p className="landing-footer__copy">© {new Date().getFullYear()} Zebdoo Client. All rights reserved.</p>
    </footer>
  );
};

export default LandingFooter;
