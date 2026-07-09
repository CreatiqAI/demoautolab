import Auth from './Auth';

// /register renders the shared Auth shell pre-slid to the registration form.
// The actual form lives in components/auth/RegisterForm and the two-panel shell
// (with the login ⇄ register slide) lives in Auth.
const Register = () => <Auth initialMode="register" />;

export default Register;
