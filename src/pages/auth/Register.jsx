import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { registerUser } from '../../api/auth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import {
  BookOpen,
  CircleCheckBig,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getDefaultAppRoute, ROUTES } from '../../routes/routePaths';
import { useAppToast } from '../../components/notifications/useAppToast';
import './register.css';

const Register = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { pushToast } = useAppToast();

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Please enter your full name.'),
    srno: Yup.string().required('Please enter your ICAI SR No.'),
    email: Yup.string().email('Please enter a valid email address.').required('Please enter your email address.'),
    level: Yup.string()
      .oneOf(['Foundation', 'Inter', 'Final'], 'Please choose your CA level.')
      .required('Please choose your CA level.'),
    password: Yup.string()
      .min(8, 'Use at least 8 characters in your password.')
      .matches(/[a-z]/, 'Add at least one lowercase letter.')
      .matches(/[A-Z]/, 'Add at least one uppercase letter.')
      .matches(/[0-9]/, 'Add at least one number.')
      .matches(/[!@#$%^&*]/, 'Add at least one symbol: ! @ # $ % ^ & *')
      .required('Please create a password.'),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const res = await registerUser(values);
      login(res.user, res.token, res.expiresAt, res.refreshToken);
      pushToast({
        title: 'Registration successful',
        message: 'Your account has been created and signed in.',
        tone: 'success',
      });
      navigate(getDefaultAppRoute(res.user?.role));
    } catch (err) {
      setErrors({ general: err.message });
      pushToast({
        title: 'Registration failed',
        message: err.message || 'Unable to create your account right now.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-page__shape register-page__shape--top" aria-hidden="true" />
      <div className="register-page__shape register-page__shape--bottom" aria-hidden="true" />

      <main className="register-shell" aria-labelledby="register-title">
        <section className="register-brand-panel" aria-label="Reasons to create a Zebdoo account">
          <span className="register-brand-panel__tag">Zebdoo Student Onboarding</span>
          <h1 id="register-title">Build your CA prep workspace in minutes.</h1>
          <p>
            Create your account to unlock structured test practice, chapter-wise learning plans,
            and performance insights built for ICAI students.
          </p>

          <ul className="register-benefits" aria-label="Registration benefits">
            <li>
              <span className="register-benefits__icon" aria-hidden="true">
                <BookOpen size={16} />
              </span>
              Access focused study paths for Foundation, Inter, and Final.
            </li>
            <li>
              <span className="register-benefits__icon" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              Track progress and confidence with smart test analytics.
            </li>
            <li>
              <span className="register-benefits__icon" aria-hidden="true">
                <ShieldCheck size={16} />
              </span>
              Keep your profile and practice history secure.
            </li>
          </ul>

          <div className="register-trust-note" aria-label="Trust assurance">
            <CircleCheckBig size={16} aria-hidden="true" />
            <span>Your account is created instantly and you are signed in right away.</span>
          </div>
        </section>

        <section className="register-form-panel" aria-label="Student registration form">
          <header className="register-form-header">
            <h2>Create your account</h2>
            <p>All fields are required so we can personalize your learning experience.</p>
          </header>

          <Formik
            initialValues={{
              name: '',
              srno: '',
              email: '',
              level: '',
              password: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="register-form" noValidate>
                {errors.general && (
                  <div className="register-alert" role="alert" aria-live="polite">
                    {errors.general}
                  </div>
                )}

                <div className="register-grid" role="group" aria-label="Student information">
                  <div className="register-field-group">
                    <label className="register-label" htmlFor="name">
                      Full Name <span aria-hidden="true">*</span>
                    </label>
                    <Field
                      id="name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="e.g. Aarav Sharma"
                      className={`register-field ${touched.name && errors.name ? 'is-invalid' : ''}`}
                      aria-invalid={Boolean(touched.name && errors.name)}
                    />
                    <ErrorMessage name="name" component="div" className="register-field-error" />
                  </div>

                  <div className="register-field-group">
                    <label className="register-label" htmlFor="srno">
                      ICAI SR No <span aria-hidden="true">*</span>
                    </label>
                    <Field
                      id="srno"
                      type="text"
                      name="srno"
                      autoComplete="off"
                      placeholder="e.g. SRO1234567"
                      className={`register-field ${touched.srno && errors.srno ? 'is-invalid' : ''}`}
                      aria-invalid={Boolean(touched.srno && errors.srno)}
                      aria-describedby="srno-help"
                    />
                    <p id="srno-help" className="register-helper-text">
                      Your ICAI SR No helps us align your test journey.
                    </p>
                    <ErrorMessage name="srno" component="div" className="register-field-error" />
                  </div>

                  <div className="register-field-group">
                    <label className="register-label" htmlFor="email">
                      Email Address <span aria-hidden="true">*</span>
                    </label>
                    <Field
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={`register-field ${touched.email && errors.email ? 'is-invalid' : ''}`}
                      aria-invalid={Boolean(touched.email && errors.email)}
                    />
                    <ErrorMessage name="email" component="div" className="register-field-error" />
                  </div>

                  <div className="register-field-group">
                    <label className="register-label" htmlFor="level">
                      CA Level <span aria-hidden="true">*</span>
                    </label>
                    <Field
                      id="level"
                      as="select"
                      name="level"
                      className={`register-field ${touched.level && errors.level ? 'is-invalid' : ''}`}
                      aria-invalid={Boolean(touched.level && errors.level)}
                    >
                      <option value="">Select your level</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Inter">Inter</option>
                      <option value="Final">Final</option>
                    </Field>
                    <ErrorMessage name="level" component="div" className="register-field-error" />
                  </div>

                  <div className="register-field-group register-field-group--full">
                    <label className="register-label" htmlFor="password">
                      Create Password <span aria-hidden="true">*</span>
                    </label>
                    <Field
                      id="password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="Use 8+ characters with upper, lower, number, and symbol"
                      className={`register-field ${touched.password && errors.password ? 'is-invalid' : ''}`}
                      aria-invalid={Boolean(touched.password && errors.password)}
                    />
                    <p className="register-helper-text">
                      Tip: Use something memorable but hard to guess.
                    </p>
                    <ErrorMessage name="password" component="div" className="register-field-error" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="register-submit-btn">
                  {isSubmitting ? 'Creating your account...' : 'Create account'}
                </button>

                <p className="register-submit-note" aria-live="polite">
                  {isSubmitting ? 'Please wait while we securely register your profile.' : 'You will be logged in immediately after successful registration.'}
                </p>
              </Form>
            )}
          </Formik>

          <p className="register-login-copy">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate(ROUTES.auth.login)}
              className="register-login-btn"
            >
              Sign in here
            </button>
          </p>
        </section>
      </main>
    </div>
  );
};

export default Register;
