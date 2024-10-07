import { useRoutes, Navigate, useLocation } from "react-router-dom";
// import { useSelector } from 'react-redux';
// import { useEffect } from 'react';
// import { useDispatch } from 'react-redux';

import App from "./App.tsx";
import AuthenticationPage from "@/components/authentication/page.tsx";

export default function Router() {
  // Define routes using useRoutes() hook for dynamic route config
  const routes = useRoutes([
    {
      path: "/",
      //element: <DashboardLayout />, // Your layout that wraps around everything
      children: [
        // Redirects immediately to /home
        { element: <Navigate to="/images-project" />, index: true },
        // Your routes wrapped in ProtectedRoute component
        // { path: 'images-project', element: <ProtectedRoute><Home /></ProtectedRoute> },
        { path: "images-project", element: <App /> },
        // { path: 'templates', element: <ProtectedRoute><DataGridView /></ProtectedRoute> },
        // { path: 'edit', element: <ProtectedRoute><DocUpload /></ProtectedRoute> },
        // { path: 'generate', element: <ProtectedRoute><AiGenerator /></ProtectedRoute> },
        // { path: 'chatpdf', element: <ProtectedRoute><ChatPdf /></ProtectedRoute> },
        // // { path: 'image-gen', element: <ProtectedRoute><ImgGenerator /></ProtectedRoute> },
        // // Public routes below
        { path: "login", element: <AuthenticationPage /> },
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
