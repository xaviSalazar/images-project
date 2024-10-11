import { useRoutes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
// import { useSelector } from 'react-redux';
// import { useEffect } from 'react';
// import { useDispatch } from 'react-redux';
import App from "./App.tsx";
import AuthenticationPage from "@/components/authentication/RegisterPage.tsx";
import LoginPage from "@/components/authentication/LoginPage.tsx";
import ForgotPasswordPage from "@/components/authentication/ForgotPassword.tsx"
import { useAuthStore } from "@/lib/states";

function ProtectedRoute({ children }) {
  const [isLoggedIn] = useAuthStore((state) => [
    state.isLoggedIn,
    state.login,
    state.logout,
  ]);
  const location = useLocation();
  if (!isLoggedIn) {
    // Redirect to login but remember the location we're trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // If authenticated, show the intended route's component
  return children;
}

export default function Router() {
  const [autoLogin] = useAuthStore((state) => [state.autoLogin]);

  useEffect(() => {
    autoLogin();
  }, []);

  // Define routes using useRoutes() hook for dynamic route config
  const routes = useRoutes([
    {
      path: "/",
      //element: <DashboardLayout />, // Your layout that wraps around everything
      children: [
        // Redirects immediately to /home
        { element: <Navigate to="/images-project" />, index: true },
        // Your routes wrapped in ProtectedRoute component
        {
          path: "images-project",
          element: (
            <ProtectedRoute>
              {" "}
              <App />{" "}
            </ProtectedRoute>
          ),
        },
        { path: "login", element: <LoginPage /> },
        { path: "registration", element: <AuthenticationPage /> },
        { path: "forgot-password", element: <ForgotPasswordPage/>},
        // { path: 'signup', element: <SignUp />},
      ],
    },
    // Add more routes as needed
    // Example: Error handling, external layouts, etc.
    // {
    //   path: '*',
    //   element: <Navigate to="/404" replace />,
    // },
  ]);

  return routes;
}
