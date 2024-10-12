import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const GOOGLE_CRED = import.meta.env.VITE_GOOGLE_AUTH_CRED;

export default function GoogleAuth() {
    const onSuccess = async (res: CredentialResponse) => {
        console.log(res);
        // Assuming res has 'clientId' and 'credential' properties for your dispatch
        // dispatch(doGoogleLogin({ clientId: res.clientId, credential: res.credential }));
    };
    
    // Modify onFailure to not expect any arguments
    const onFailure = () => {
        console.log('failed');
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CRED}>
            <GoogleLogin
                onSuccess={onSuccess}
                onError={onFailure}  // Adjusted to match expected type
            />
        </GoogleOAuthProvider>
    );
}
