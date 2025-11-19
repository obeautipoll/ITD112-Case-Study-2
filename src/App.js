import { useRoutes, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/authContext";


// Styles
import "./styles/students.css";
import "./styles-admin/admin.css";


// Auth components
import Login from "./components/auth/login";
import Register from "./components/auth/register";

// Layout and page components
import Header from "./components/header";
import AdminDashboard from "./frontend/admin-pages/admin-dashboard";

// Student Pages
import FileComplaint from "./frontend/public-pages/ComplaintForm";
import Notifications from "./frontend/public-pages/Notifications";
import ComplaintHistory from "./frontend/public-pages/ComplaintHistory";
import Dashboard from "./frontend/public-pages/Dashboard";
import PSettings from "./frontend/public-pages/Settings";


// Admin Pages
import UserManagementView from "./frontend/admin-pages/admin-userManage";
import AdminMonitorComplaints from "./frontend/admin-pages/admin-monitoring";
import Analytics from "./frontend/admin-pages/admin-analytics";
import Settings from "./frontend/admin-pages/admin-setting";

// PrivateRoute component to handle role-based route protection
const PrivateRoute = ({ element, requiredRole }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  
  // If the user is not logged in or doesn't have the required role, redirect to login
  if (!user || user.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return element;
};

// Main App component
function App() {
  // Define your routes with path-to-component mappings
  const routesArray = [
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/register",
      element: <Register />,
    },
    {
      path: "/dashboard",
      element: (
        <PrivateRoute
          element={<Dashboard />}
          requiredRole="public" // Protect the route, only accessible by students
        />
      ),
    },
    {
      path: "/file-complaint",
      element: (
        <PrivateRoute
          element={<FileComplaint />}
          requiredRole="public" // Protect the route, only accessible by students
        />
      ),
    },
    {
      path: "/notifications",
      element: (
        <PrivateRoute
          element={<Notifications />}
          requiredRole="public" // Protect the route, only accessible by students
        />
      ),
    },
    {
      path: "/settings",
      element: (
        <PrivateRoute
          element={<PSettings />}
          requiredRole="public" // Protect the route, only accessible by students
        />
      ),
    },
    {
      path: "/history",
      element: (
        <PrivateRoute
          element={<ComplaintHistory />}
          requiredRole="public" // Protect the route, only accessible by students
        />
      ),
    },
   {
  path: "/adashboard",
  element: (
    <PrivateRoute 
      element={<AdminDashboard />}
      requiredRole="admin" // Protect the route, only accessible by admins
    />
  ),
  },
  {
    path: "/amanageusers",
    element: (
      <PrivateRoute
        element={<UserManagementView />}
        requiredRole="admin" // Protect the route, only accessible by admins
      />
    ),
  },
  {
    path: "/aanalytics",
    element: (
      <PrivateRoute
        element={<Analytics />}
        requiredRole="admin" // Protect the route, only accessible by admins
      />
    ),
  },
  {
    path: "/asettings",
    element: (
      <PrivateRoute
        element={<Settings />}
        requiredRole="admin" // Protect the route, only accessible by admins
      />
    ),
  },
  {
    path: "/aemigrants",
    element: (
      <PrivateRoute
        element={<AdminMonitorComplaints />}
        requiredRole="admin" // Protect the route, only accessible by admins
      />
    ),
  },
    {
      path: "*", // Catch-all route for undefined paths
      element: <Navigate to="/dashboard" replace />, // Redirect to login page
    },
  ];

  // Using useRoutes to render the appropriate component based on the URL
  const routesElement = useRoutes(routesArray);

  return (
    <AuthProvider>
      <Header /> {/* Always show header */}
      <div className="w-full h-screen flex flex-col">
        {routesElement} {/* Render the matched route */}
      </div>
    </AuthProvider>
  );
}

export default App;
