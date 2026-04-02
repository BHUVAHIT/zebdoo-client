import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { registerUser } from '../../api/auth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getDefaultAppRoute, ROUTES } from '../../routes/routePaths';
import { useAppToast } from '../../components/notifications/useAppToast';

const Register = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { pushToast } = useAppToast();

  // Yup validation schema
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    srno: Yup.string().required('ICAI SR No is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    level: Yup.string().oneOf(['Foundation', 'Inter', 'Final'], 'Select a valid level').required('Level is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(/[a-z]/, 'Password must include a lowercase letter')
      .matches(/[A-Z]/, 'Password must include an uppercase letter')
      .matches(/[0-9]/, 'Password must include a number')
      .matches(/[!@#$%^&*]/, 'Password must include a symbol: ! @ # $ % ^ & *')
      .required('Password is required'),
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-green-400 to-blue-500 p-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 sm:p-12 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          CA Student Registration
        </h1>

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
          {({ isSubmitting, errors }) => (
            <Form className="space-y-4">
              {errors.general && (
                <div className="text-red-500 text-sm text-center">
                  {errors.general}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-gray-700 mb-1">Full Name</label>
                <Field
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              {/* SR No */}
              <div>
                <label className="block text-gray-700 mb-1">ICAI SR No</label>
                <Field
                  type="text"
                  name="srno"
                  placeholder="Enter SR No"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="srno" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-1">Email</label>
                <Field
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              {/* Level of Study */}
              <div>
                <label className="block text-gray-700 mb-1">Level of Study</label>
                <Field
                  as="select"
                  name="level"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">Select Level</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Inter">Inter</option>
                  <option value="Final">Final</option>
                </Field>
                <ErrorMessage name="level" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 mb-1">Password</label>
                <Field
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold py-3 rounded-lg hover:from-green-600 hover:to-blue-700 transition duration-300"
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </Form>
          )}
        </Formik>

        <p className="text-center text-gray-500 mt-4 text-sm">
          Already have an account?{' '}
          <span
            onClick={() => navigate(ROUTES.auth.login)}
            className="text-green-500 cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
