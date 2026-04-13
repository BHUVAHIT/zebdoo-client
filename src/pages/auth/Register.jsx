import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import * as Yup from "yup";
import {
  ArrowRight,
  Clock3,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { registerUser } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useAppToast } from "../../components/notifications/useAppToast";
import { getDefaultAppRoute, ROUTES } from "../../routes/routePaths";
import {
  CA_LEVEL_VALUES,
  STANDARD_VALUES,
  STREAM_VALUES,
  buildStudentPayload,
} from "../../modules/shared/student/studentFormContract";
import "./register.css";

const FieldError = ({ name, id }) => (
  <ErrorMessage name={name}>
    {(msg) => (
      <span className="register-field-error" id={id} role="alert">
        {msg}
      </span>
    )}
  </ErrorMessage>
);

const STREAM_VISUAL_PROFILES = {
  default: {
    badge: "Student-first onboarding",
    spotlightTitle: "Designed for momentum",
    spotlightCopy: "Set your profile once and get a guided dashboard tuned to your prep style.",
    statPrimary: "Guided prep paths",
    statSecondary: "1-min account setup",
    themeClass: "register-story--default",
  },
  CA: {
    badge: "CA pathway activated",
    spotlightTitle: "Precision for CA milestones",
    spotlightCopy: "Your ICAI profile and level-aware setup keep every session structured and outcome focused.",
    statPrimary: "Level-wise CA planning",
    statSecondary: "SR profile ready",
    themeClass: "register-story--ca",
  },
  Science: {
    badge: "Science journey unlocked",
    spotlightTitle: "Built for concept mastery",
    spotlightCopy: "Get a syllabus rhythm engineered for concept depth, chapter confidence, and exam readiness.",
    statPrimary: "Concept mastery tracks",
    statSecondary: "Physics-Chem-Bio ready",
    themeClass: "register-story--science",
  },
  Commerce: {
    badge: "Commerce track ready",
    spotlightTitle: "Commerce strategy, simplified",
    spotlightCopy: "Move through accounts and business topics with clear sequencing and measurable milestones.",
    statPrimary: "Accounts and eco paths",
    statSecondary: "Score-driven progression",
    themeClass: "register-story--commerce",
  },
};

const REGISTER_STORY_SLIDES = [
  {
    id: "journey",
    imageSrc: "/student-commerce.svg",
    title: "Start with clarity, move with confidence.",
    description:
      "Your onboarding flow adapts instantly, so every learner begins with the right structure and zero friction.",
    caption: "A focused start changes the entire learning curve.",
    chips: ["Adaptive onboarding", "Instant personalized setup"],
  },
  {
    id: "results",
    imageSrc: "/student-ca.svg",
    title: "Disciplined systems create top results.",
    description:
      "From planning to revision cadence, Zebdoo helps students sustain momentum and convert effort into outcomes.",
    caption: "Consistency, feedback, and measurable growth in one loop.",
    chips: ["Progress checkpoints", "Smart revision cadence"],
  },
  {
    id: "experience",
    imageSrc: "/student-science.svg",
    title: "One platform, every core learning need.",
    description:
      "Built for modern students with smooth UX, secure access, and guided journeys across streams and standards.",
    caption: "A premium study experience designed for everyday execution.",
    chips: ["Secure by default", "Designed for focus"],
  },
];

const FormField = ({
  label,
  name,
  icon: Icon,
  helperText,
  required,
  full,
  className,
  trailing,
  children,
}) => {
  const { errors, touched } = useFormikContext();
  const hasError = Boolean(touched[name] && errors[name]);

  return (
    <div
      className={`register-field-group ${full ? "register-field-group--full" : ""} ${className || ""}`}
    >
      <label htmlFor={name} className="register-label">
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>

      <div className={`register-input-shell ${hasError ? "is-invalid" : ""}`}>
        {Icon && <Icon size={16} className="register-input-shell__icon" aria-hidden="true" />}
        {children}
        {trailing}
      </div>

      {helperText && !hasError && (
        <p className="register-helper-text" id={`${name}-help`}>
          {helperText}
        </p>
      )}
      <FieldError name={name} id={`${name}-error`} />
    </div>
  );
};

const RegisterForm = ({ navigate, onStreamVisualChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    errors,
    isSubmitting,
    setFieldTouched,
    setFieldValue,
    values,
  } = useFormikContext();

  const handleStreamChange = (newStream) => {
    setFieldValue("stream", newStream);
    onStreamVisualChange?.(newStream);

    if (newStream === "CA") {
      setFieldValue("standard", "");
      setFieldTouched("standard", false, false);
      return;
    }

    setFieldValue("srno", "");
    setFieldValue("caLevel", "");
    setFieldTouched("srno", false, false);
    setFieldTouched("caLevel", false, false);
  };

  const handleMobileChange = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
    setFieldValue("mobile", digitsOnly);
  };

  return (
    <Form className="register-form" noValidate>
      {errors.general && (
        <div className="register-alert" role="alert">
          {errors.general}
        </div>
      )}

      <div className="register-grid register-grid--main">
        <FormField label="First Name" name="firstName" required>
          <Field
            as="input"
            id="firstName"
            name="firstName"
            type="text"
            placeholder="First name"
            autoComplete="given-name"
            className="register-field"
          />
        </FormField>

        <FormField label="Last Name" name="lastName" required>
          <Field
            as="input"
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Last name"
            autoComplete="family-name"
            className="register-field"
          />
        </FormField>

        <FormField label="Email Address" name="email" icon={Mail} required>
          <Field
            as="input"
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="register-field"
          />
        </FormField>

        <FormField
          label="Mobile Number"
          name="mobile"
          icon={Phone}
          helperText="10-digit mobile number"
          required
        >
          <Field
            as="input"
            id="mobile"
            name="mobile"
            type="tel"
            placeholder="9876543210"
            inputMode="numeric"
            maxLength="10"
            autoComplete="tel-national"
            className="register-field"
            onChange={handleMobileChange}
          />
        </FormField>

        <FormField label="Stream / Category" name="stream" required>
          <Field
            as="select"
            id="stream"
            name="stream"
            className="register-field"
            onChange={(event) => handleStreamChange(event.target.value)}
          >
            <option value="">Select stream</option>
            {STREAM_VALUES.map((stream) => (
              <option key={stream} value={stream}>
                {stream}
              </option>
            ))}
          </Field>
        </FormField>

        <FormField
          label="Password"
          name="password"
          icon={Lock}
          required
          trailing={(
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={`register-password-toggle ${showPassword ? "is-active" : ""}`}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              <span className="register-password-toggle__icon" aria-hidden="true">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
              <span>{showPassword ? "Hide" : "Show"}</span>
            </button>
          )}
        >
          <Field
            as="input"
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create your password"
            autoComplete="new-password"
            className="register-field"
          />
        </FormField>

        <div className="register-field-group register-field-group--full">
          <div
            className={`register-dynamic-slot ${values.stream ? "is-ready" : ""} ${values.stream ? `register-dynamic-slot--${values.stream.toLowerCase()}` : ""}`}
            aria-live="polite"
          >
            {values.stream === "CA" && (
              <div className="register-dynamic-grid register-dynamic-pane">
                <FormField label="ICAI SR Number" name="srno" required>
                  <Field
                    as="input"
                    id="srno"
                    name="srno"
                    type="text"
                    placeholder="SRO1234567"
                    autoComplete="off"
                    className="register-field"
                  />
                </FormField>

                <FormField label="CA Level" name="caLevel" required>
                  <Field
                    as="select"
                    id="caLevel"
                    name="caLevel"
                    className="register-field"
                  >
                    <option value="">Select CA level</option>
                    {CA_LEVEL_VALUES.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Field>
                </FormField>
              </div>
            )}

            {(values.stream === "Science" || values.stream === "Commerce") && (
              <div className="register-dynamic-grid register-dynamic-grid--single register-dynamic-pane">
                <FormField label="Standard" name="standard" required className="register-field-group--standard">
                  <Field
                    as="select"
                    id="standard"
                    name="standard"
                    className="register-field"
                  >
                    <option value="">Select standard</option>
                    {STANDARD_VALUES.map((standard) => (
                      <option key={standard} value={standard}>
                        {standard}
                      </option>
                    ))}
                  </Field>
                </FormField>
              </div>
            )}

            {!values.stream && (
              <div className="register-dynamic-placeholder" role="status">
                <span className="register-dynamic-placeholder__icon" aria-hidden="true">
                  <Sparkles size={15} />
                </span>

                <div className="register-dynamic-placeholder__content">
                  <p>Pick your stream to auto-show only relevant fields.</p>
                  <div className="register-dynamic-placeholder__chips">
                    <span>CA: SR No + Level</span>
                    <span>Science / Commerce: Standard</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="register-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="register-submit-btn"
          aria-busy={isSubmitting}
        >
          {isSubmitting && <span className="register-submit-btn__spinner" aria-hidden="true" />}
          <span>{isSubmitting ? "Creating account..." : "Create Account"}</span>
          {!isSubmitting && <ArrowRight size={16} aria-hidden="true" />}
        </button>

        <p className="register-submit-note">
          {isSubmitting
            ? "Securing profile and preparing your dashboard..."
            : "You will be signed in automatically right after registration."}
        </p>

        <p className="register-login-copy">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate(ROUTES.auth.login)}
            className="register-login-btn"
          >
            Sign in
          </button>
        </p>
      </div>
    </Form>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [activeStoryStream, setActiveStoryStream] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const login = useAuthStore((state) => state.login);
  const { pushToast } = useAppToast();
  const storyProfile = STREAM_VISUAL_PROFILES[activeStoryStream] || STREAM_VISUAL_PROFILES.default;

  useEffect(() => {
    if (isStoryPaused) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % REGISTER_STORY_SLIDES.length);
    }, 4500);

    return () => window.clearInterval(timerId);
  }, [isStoryPaused]);

  const validationSchema = Yup.object().shape({
    firstName: Yup.string()
      .trim()
      .matches(/^[A-Za-z ]+$/, "Use only alphabets and spaces for first name.")
      .min(2, "First name must be at least 2 characters.")
      .max(50, "First name must be at most 50 characters.")
      .required("Please enter your first name."),
    lastName: Yup.string()
      .trim()
      .matches(/^[A-Za-z ]+$/, "Use only alphabets and spaces for last name.")
      .min(1, "Last name must be at least 1 character.")
      .max(50, "Last name must be at most 50 characters.")
      .required("Please enter your last name."),
    email: Yup.string()
      .email("Please enter a valid email address.")
      .required("Please enter your email address."),
    stream: Yup.string()
      .oneOf(STREAM_VALUES, "Please choose a valid stream/category.")
      .required("Please choose your stream/category."),
    mobile: Yup.string()
      .required("Please enter your mobile number.")
      .matches(/^\d{10}$/, "Enter a valid 10-digit mobile number."),
    srno: Yup.string().when("stream", {
      is: "CA",
      then: (schema) => schema
        .trim()
        .required("Please enter your ICAI SR No.")
        .matches(/^[A-Za-z0-9]{6,20}$/, "Use 6-20 letters or numbers for ICAI SR No."),
      otherwise: (schema) => schema.notRequired(),
    }),
    caLevel: Yup.string().when("stream", {
      is: "CA",
      then: (schema) => schema
        .oneOf(CA_LEVEL_VALUES, "Please choose your CA level.")
        .required("Please choose your CA level."),
      otherwise: (schema) => schema.notRequired(),
    }),
    standard: Yup.string().when("stream", {
      is: (stream) => stream === "Science" || stream === "Commerce",
      then: (schema) => schema
        .oneOf(STANDARD_VALUES, "Please choose a valid standard.")
        .required("Please choose your standard."),
      otherwise: (schema) => schema.notRequired(),
    }),
    password: Yup.string()
      .min(8, "Use at least 8 characters in your password.")
      .matches(/[a-z]/, "Add at least one lowercase letter.")
      .matches(/[A-Z]/, "Add at least one uppercase letter.")
      .matches(/[0-9]/, "Add at least one number.")
      .matches(/[!@#$%^&*]/, "Add at least one symbol: ! @ # $ % ^ & *")
      .required("Please create a password."),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const payload = buildStudentPayload(values, {
        includePassword: true,
      });
      const res = await registerUser(payload);
      login(res.user, res.token, res.expiresAt, res.refreshToken);
      pushToast({
        title: "Registration successful",
        message: "Your account has been created and signed in.",
        tone: "success",
      });
      navigate(getDefaultAppRoute(res.user?.role));
    } catch (err) {
      setErrors({ general: err.message });
      pushToast({
        title: "Registration failed",
        message: err.message || "Unable to create your account right now.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-page__ambient register-page__ambient--left" aria-hidden="true" />
      <div className="register-page__ambient register-page__ambient--right" aria-hidden="true" />

      <main className="register-shell" aria-labelledby="register-title">
        <aside
          className={`register-story ${storyProfile.themeClass}`}
          onMouseEnter={() => setIsStoryPaused(true)}
          onMouseLeave={() => setIsStoryPaused(false)}
          onFocusCapture={() => setIsStoryPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsStoryPaused(false);
            }
          }}
        >
          <div className="register-story__orb register-story__orb--warm" />
          <div className="register-story__orb register-story__orb--mint" />
          <div className="register-story__orb register-story__orb--sky" />

          <div className="register-story__topbar">
            <div className="register-story__badge">
              <Sparkles size={14} aria-hidden="true" />
              {storyProfile.badge}
            </div>

            <p className="register-story__slide-index" aria-live="polite">
              0{activeSlideIndex + 1} / 0{REGISTER_STORY_SLIDES.length}
            </p>
          </div>

          <div className="register-story__carousel" aria-label="Onboarding highlights" aria-live="polite">
            {REGISTER_STORY_SLIDES.map((slide, index) => (
              <article
                key={slide.id}
                className={`register-story__slide ${index === activeSlideIndex ? "is-active" : ""}`}
                aria-hidden={index !== activeSlideIndex}
              >
                <figure className="register-story__media">
                  <img src={slide.imageSrc} alt="" loading="lazy" />
                  <figcaption>{slide.caption}</figcaption>
                </figure>

                <h2>{slide.title}</h2>
                <p>{slide.description}</p>

                <div className="register-story__chips" aria-hidden="true">
                  {slide.chips.map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="register-story__dots" role="tablist" aria-label="Story slides">
            {REGISTER_STORY_SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                className={`register-story__dot ${index === activeSlideIndex ? "is-active" : ""}`}
                aria-selected={index === activeSlideIndex}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                onClick={() => setActiveSlideIndex(index)}
              />
            ))}
          </div>

          <div className="register-story__card">
            <div className="register-story__avatar">
              <GraduationCap size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>{storyProfile.spotlightTitle}</strong>
              <span>{storyProfile.spotlightCopy}</span>
            </div>
          </div>

          <div className="register-story__stats">
            <span>
              <BookOpen size={14} aria-hidden="true" />
              {storyProfile.statPrimary}
            </span>
            <span>
              <Clock3 size={14} aria-hidden="true" />
              {storyProfile.statSecondary}
            </span>
          </div>
        </aside>

        <section className="register-content">
          <header className="register-hero">
            <div className="register-hero__copy">
              <span className="register-hero__badge">Zebdoo Enrollment</span>
              <h1 id="register-title">Create your account in one smooth step</h1>
              <p>
                Fast, secure, and focused onboarding built for students.
              </p>
            </div>

            <div className="register-hero__pills" aria-label="Registration highlights">
              <span>
                <Clock3 size={14} aria-hidden="true" />
                30 sec setup
              </span>
              <span>
                <ShieldCheck size={14} aria-hidden="true" />
                Secure sign up
              </span>
              <span>
                <User size={14} aria-hidden="true" />
                Personalized journey
              </span>
            </div>
          </header>

          <Formik
            initialValues={{
              firstName: "",
              lastName: "",
              email: "",
              stream: "",
              mobile: "",
              srno: "",
              caLevel: "",
              standard: "",
              password: "",
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            <RegisterForm navigate={navigate} onStreamVisualChange={setActiveStoryStream} />
          </Formik>
        </section>
      </main>
    </div>
  );
};

export default Register;