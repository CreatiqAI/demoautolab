import Auth from './Auth';

// /merchant-register renders the shared Auth shell pre-slid to the merchant form.
// The form itself lives in components/auth/MerchantRegisterForm; the two-panel
// shell + login ⇄ register ⇄ merchant slide lives in Auth.
const MerchantRegister = () => <Auth initialMode="merchant" />;

export default MerchantRegister;
