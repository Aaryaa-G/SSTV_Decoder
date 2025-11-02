import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    // 🔍 Verify token silently
    fetch("http://localhost:5000/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        setIsLoggedIn(true);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  return (
    <nav className="bg-black/50 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/20">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-white font-bold hover:text-blue-400">
          Home
        </Link>

        {isLoggedIn && (
          <>
            <Link
              to="/dashboard"
              className="text-white font-bold hover:text-blue-400"
            >
              Dashboard
            </Link>
            <Link
              to="/gallery"
              className="text-white font-bold hover:text-blue-400"
            >
              Gallery
            </Link>
            <Link
              to="/upload"
              className="text-white font-bold hover:text-blue-400"
            >
              Upload
            </Link>
          </>
        )}
      </div>

      {checkingAuth ? (
        <span className="text-gray-400 text-sm">Checking session...</span>
      ) : isLoggedIn ? (
        <div className="flex items-center gap-4">
          <Link
            to="/profile"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white"
          >
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white"
          >
            Logout
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
        >
          Login
        </Link>
      )}
    </nav>
  );
};

export default Navbar;
