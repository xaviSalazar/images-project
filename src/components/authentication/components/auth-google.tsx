import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useStore } from "@/lib/states";
import { toast } from "@/components/ui/use-toast";

export const GOOGLE_CRED = import.meta.env.VITE_GOOGLE_AUTH_CRED;

export default function GoogleAuth() {
    const [googleLogin] = useStore((state) => [state.googleLogin]);

    const onSuccess = async (res: CredentialResponse) => {
        googleLogin({ clientId: res.clientId, credential: res.credential })
    };
    
    // Modify onFailure to not expect any arguments
    const onFailure = () => {
        toast({
            variant: "destructive",
            title: "GOOGLELOGIN FAILED",
          });
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
