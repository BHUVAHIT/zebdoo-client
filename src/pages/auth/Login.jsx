import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { loginUser } from '../../api/auth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useEffect } from 'react';
import { GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { getDefaultAppRoute, ROUTES } from '../../routes/routePaths';
import { useAppToast } from '../../components/notifications/useAppToast';
import './login.css';

const DEMO_USERS = {
  superAdmin: {
    email: 'superadmin@zebdoo.com',
    password: 'SuperAdmin@123',
  },
  student: {
    email: 'student1@zebdoo.com',
    password: 'Student@123',
  },
};

const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const { pushToast } = useAppToast();

  // Validation schema using Yup
  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const res = await loginUser(values.email, values.password);
      login(res.user, res.token, res.expiresAt, res.refreshToken);
      pushToast({
        title: 'Login successful',
        message: `Welcome back, ${res.user?.name || 'User'}.`,
        tone: 'success',
      });
      if (res.forcePasswordChange) {
        pushToast({
          title: 'Password update required',
          message: 'Your account requires a password update. Please contact Super Admin support.',
          tone: 'warning',
        });
      }
      navigate(getDefaultAppRoute(res.user?.role));
    } catch (err) {
      setErrors({ general: err.message });
      pushToast({
        title: 'Login failed',
        message: err.message || 'Unable to authenticate with provided credentials.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) {
      navigate(getDefaultAppRoute(user.role));
    }
  }, [navigate, user]);

  return (
    <div className="login-page">
      <div className="login-page__shape login-page__shape--left" aria-hidden="true" />
      <div className="login-page__shape login-page__shape--right" aria-hidden="true" />

      <main className="login-shell" aria-labelledby="login-title">
        <section className="login-brand-panel" aria-label="Zebdoo learning platform highlights">
          <span className="login-brand-panel__tag">Zebdoo Learning Platform</span>
          <h1 id="login-title">Learn smarter. Stay exam-ready.</h1>
          <p>
            Access your personalized study plans, test analytics, and progress dashboard in one secure place.
          </p>

          <ul className="login-benefits" aria-label="Platform benefits">
            <li>
              <span className="login-benefits__icon" aria-hidden="true">
                <GraduationCap size={16} />
              </span>
              Structured learning paths for CA students
            </li>
            <li>
              <span className="login-benefits__icon" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              Quick practice sessions with performance insights
            </li>
            <li>
              <span className="login-benefits__icon" aria-hidden="true">
                <ShieldCheck size={16} />
              </span>
              Secure access with role-based workspace
            </li>
          </ul>
        </section>

        <section className="login-form-panel" aria-label="Sign in form">
          <header className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue your learning journey.</p>
          </header>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({
              isSubmitting,
              errors,
              touched,
              setValues,
              setTouched,
              setErrors,
              submitForm,
            }) => {
              const handleDemoLogin = async (credentials) => {
                setErrors({});
                await setValues(credentials, true);
                await setTouched({ email: true, password: true }, true);
                await submitForm();
              };

              return (
                <Form className="login-form" noValidate>
                  {errors.general && (
                    <div className="login-alert" role="alert" aria-live="polite">
                      {errors.general}
                    </div>
                  )}

                  <div className="login-field-group">
                    <label className="login-label" htmlFor="email">
                      Email
                    </label>
                    <Field
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      className={`login-field ${touched.email && errors.email ? 'is-invalid' : ''}`}
                    />
                    <ErrorMessage name="email" component="div" className="login-field-error" />
                  </div>

                  <div className="login-field-group">
                    <label className="login-label" htmlFor="password">
                      Password
                    </label>
                    <Field
                      id="password"
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`login-field ${touched.password && errors.password ? 'is-invalid' : ''}`}
                    />
                    <ErrorMessage name="password" component="div" className="login-field-error" />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="login-submit-btn">
                    {isSubmitting ? 'Signing you in...' : 'Sign in'}
                  </button>

                  <div className="login-divider" role="separator" aria-label="Demo login options">
                    <span>Demo Login</span>
                  </div>

                  <div className="login-demo" aria-label="One click demo login">
                    <p className="login-demo__copy">
                      For quick preview, choose a role and continue using the same secure login flow.
                    </p>
                    <div className="login-demo__actions">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        className="login-demo-btn"
                        onClick={() => handleDemoLogin(DEMO_USERS.superAdmin)}
                      >
                        Login as Super Admin
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        className="login-demo-btn login-demo-btn--secondary"
                        onClick={() => handleDemoLogin(DEMO_USERS.student)}
                      >
                        Login as Student
                      </button>
                    </div>
                  </div>
                </Form>
              );
            }}
          </Formik>

          <p className="login-register-copy">
            New to Zebdoo?{' '}
            <button
              type="button"
              onClick={() => navigate(ROUTES.auth.register)}
              className="login-register-btn"
            >
              Create your account
            </button>
          </p>
        </section>
      </main>
    </div>
  );
};

export default Login;
