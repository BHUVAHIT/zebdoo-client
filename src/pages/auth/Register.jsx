import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import * as Yup from "yup";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleCheckBig,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
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

const PASSWORD_REQUIREMENTS = [
  { rule: (value) => value.length >= 8, label: "8+ characters" },
  { rule: (value) => /[a-z]/.test(value), label: "lowercase" },
  { rule: (value) => /[A-Z]/.test(value), label: "uppercase" },
  { rule: (value) => /[0-9]/.test(value), label: "number" },
  { rule: (value) => /[!@#$%^&*]/.test(value), label: "symbol" },
];

const FieldError = ({ name, id }) => (
  <ErrorMessage name={name}>
    {(msg) => (
      <span className="register-field-error" id={id} role="alert">
        {msg}
      </span>
    )}
  </ErrorMessage>
);

const PasswordStrengthIndicator = ({ password }) => {
  const meetsRequirement = (rule) => rule(password);
  const metCount = PASSWORD_REQUIREMENTS.filter((r) => meetsRequirement(r.rule)).length;
  const strengthLabel = ["Not set", "Weak", "Fair", "Good", "Strong", "Strong"][metCount];
  const strengthTone = ["muted", "weak", "fair", "good", "strong", "strong"][metCount];

  return (
    <div className="register-password-strength" aria-live="polite">
      <div className="register-password-strength__bars" role="presentation">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`register-password-strength__bar ${i < metCount ? "is-active" : ""}`}
            data-tone={strengthTone}
          />
        ))}
      </div>
      <span className="register-password-strength__text" data-tone={strengthTone}>
        Strength: {strengthLabel}
      </span>
    </div>
  );
};

const FormField = ({
  label,
  name,
  icon: Icon,
  helperText,
  required,
  full,
  children,
}) => {
  const { errors, touched } = useFormikContext();
  const hasError = Boolean(touched[name] && errors[name]);

  return (
    <div className={`register-field-group ${full ? "register-field-group--full" : ""}`}>
      <label htmlFor={name} className="register-label">
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>

      <div className={`register-input-shell ${hasError ? "is-invalid" : ""}`}>
        {Icon && <Icon size={16} className="register-input-shell__icon" aria-hidden="true" />}
        {children}
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

const RegisterForm = ({ navigate }) => {
  const {
    errors,
    isSubmitting,
    setFieldTouched,
    setFieldValue,
    values,
  } = useFormikContext();

  const handleStreamChange = (newStream) => {
    setFieldValue("stream", newStream);
    if (newStream === "CA") {
      setFieldValue("standard", "");
      setFieldTouched("standard", false, false);
    } else {
      setFieldValue("srno", "");
      setFieldValue("caLevel", "");
      setFieldTouched("srno", false, false);
      setFieldTouched("caLevel", false, false);
    }
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

      <div className="register-grid">
        <FormField label="First Name" name="firstName" required>
          <Field
            as="input"
            id="firstName"
            name="firstName"
            type="text"
            placeholder="John"
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
            placeholder="Doe"
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
          helperText="India: 10-digit mobile number"
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

        <div className="register-field-group register-field-group--full">
          <div className="register-dynamic-slot" aria-live="polite">
            {values.stream === "CA" && (
              <div className="register-dynamic-grid">
                <FormField
                  label="ICAI SR Number"
                  name="srno"
                  helperText="Use 6-20 letters or numbers"
                  required
                >
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
              <div className="register-dynamic-grid register-dynamic-grid--single">
                <FormField label="Standard" name="standard" required>
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
                <Sparkles size={16} aria-hidden="true" />
                Choose your stream to unlock stream-specific setup fields.
              </div>
            )}
          </div>
        </div>

        <FormField
          label="Password"
          name="password"
          icon={Lock}
          helperText="Use uppercase, lowercase, number and symbol"
          full
          required
        >
          <Field
            as="input"
            id="password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            className="register-field"
          />
        </FormField>

        <div className="register-field-group register-field-group--full">
          <PasswordStrengthIndicator password={values.password} />
          <div className="register-password-requirements">
            {PASSWORD_REQUIREMENTS.map((req) => (
              <div
                key={req.label}
                className={`register-password-requirement ${req.rule(values.password) ? "is-met" : ""}`}
              >
                <Check size={12} aria-hidden="true" />
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="register-actions">
        <button type="submit" disabled={isSubmitting} className="register-submit-btn">
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
  const login = useAuthStore((state) => state.login);
  const { pushToast } = useAppToast();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlHeight = html.style.height;
    const previousBodyHeight = body.style.height;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.height = previousHtmlHeight;
      body.style.height = previousBodyHeight;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, []);

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
      <div className="register-page__orb register-page__orb--top" aria-hidden="true" />
      <div className="register-page__orb register-page__orb--bottom" aria-hidden="true" />

      <main className="register-shell" aria-labelledby="register-title">
        <section className="register-hero" aria-label="Student onboarding highlights">
          <span className="register-hero__tag">Zebdoo Student Onboarding</span>
          <h1 id="register-title">Start your focused learning journey today.</h1>
          <p>
            Build your profile in one quick screen, unlock your stream-specific plan,
            and move straight into test prep momentum.
          </p>

          <ul className="register-hero__points" aria-label="Registration advantages">
            <li>
              <BookOpen size={15} aria-hidden="true" />
              Stream-aligned setup from the first login.
            </li>
            <li>
              <Sparkles size={15} aria-hidden="true" />
              Cleaner onboarding flow with zero confusion.
            </li>
            <li>
              <ShieldCheck size={15} aria-hidden="true" />
              Secure account creation and instant sign-in.
            </li>
          </ul>

          <div className="register-hero__trust">
            <CircleCheckBig size={15} aria-hidden="true" />
            Trusted by students who want clarity before speed.
          </div>
        </section>

        <section className="register-panel" aria-label="Registration form">
          <header className="register-panel__header">
            <h2>Create your account</h2>
            <p>Everything you need is visible at once. No hidden steps.</p>
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
            <RegisterForm navigate={navigate} />
          </Formik>
        </section>
      </main>
    </div>
  );
};

export default Register;
