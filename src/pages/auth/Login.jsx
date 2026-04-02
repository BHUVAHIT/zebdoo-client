import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { loginUser } from '../../api/auth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useEffect } from 'react';
import { getDefaultAppRoute, ROUTES } from '../../routes/routePaths';
import { useAppToast } from '../../components/notifications/useAppToast';

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-12 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          CA Student Planner
        </h1>

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors }) => (
            <Form className="space-y-4">
              {errors.general && (
                <div className="text-red-500 text-sm text-center">
                  {errors.general}
                </div>
              )}

              <div>
                <label className="block text-gray-700 mb-1" htmlFor="email">
                  Email
                </label>
                <Field
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <Field
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <ErrorMessage
                  name="password"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-300"
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </Form>
          )}
        </Formik>

        <p className="text-center text-gray-500 mt-4 text-sm">
          Don't have an account?{' '}
          <span
            onClick={() => navigate(ROUTES.auth.register)}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>
        <p className="text-center text-xs text-gray-500 mt-2">
          Demo: superadmin@zebdoo.com / SuperAdmin@123
        </p>
      </div>
    </div>
  );
};

export default Login;
