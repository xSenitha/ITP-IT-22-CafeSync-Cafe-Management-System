// protected route component - redirects to login if not authenticated
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, loading, user } = useAuth();

    // show loading while checking auth state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-600 border-t-transparent" />
            </div>
        );
    }

    // redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // check role based access
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'customer' ? '/' : '/dashboard'} replace />;
    }

    return children;
};

export default ProtectedRoute;
