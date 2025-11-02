import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import PrivateRoute from './pages/PrivateRoute';
import Toast from './pages/Toast';
import { NotificationProvider } from './pages/NotificationContext';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token is valid by calling /api/auth/me
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          setIsLoggedIn(true);
        } else {
          // Token invalid → clear it
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  if (loading) {
    return <nav className="bg-black/50 p-4">Loading...</nav>;
  }

  return (
    <nav className="bg-black/50 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/20">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-white font-bold hover:text-blue-400">Home</Link>
        {isLoggedIn && (
          <>
            <Link to="/dashboard" className="text-white font-bold hover:text-blue-400">Dashboard</Link>
            <Link to="/gallery" className="text-white font-bold hover:text-blue-400">Gallery</Link>
            <Link to="/upload" className="text-white font-bold hover:text-blue-400">Upload</Link>
          </>
        )}
      </div>

      {isLoggedIn ? (
        <div className="flex items-center gap-4">
          <Link
            to="/profile"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
          >
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
        >
          Login
        </Link>
      )}
    </nav>
  );
};

const App = () => {
  return (
    <NotificationProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative">
          <Navbar />
          <Toast />
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/gallery"
              element={
                <PrivateRoute>
                  <Gallery />
                </PrivateRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <PrivateRoute>
                  <Upload />
                </PrivateRoute>
              }
            />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Profile (also protected) */}
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </NotificationProvider>
  );
};

export default App;