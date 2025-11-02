// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { NotificationContext } from "../pages/NotificationContext";

const Login = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { addNotification } = useContext(NotificationContext);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addNotification("Please fill in all fields correctly", "error", 4000);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Sending login data:", form);

      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      console.log("Login successful:", res.data);

      // Store token and user info
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      addNotification(`Welcome back, ${res.data.user.username}!`, "success", 3000);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.msg || "Login failed!";
      addNotification(errorMsg, "error", 5000);
      setErrors({ submit: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-4">
      <div className="bg-black/40 p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-700/50">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded">
            <p className="text-red-300 text-sm">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              className={`w-full p-3 rounded bg-gray-800 border focus:outline-none transition ${
                errors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-700 focus:border-blue-500"
              }`}
              required
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className={`w-full p-3 rounded bg-gray-800 border focus:outline-none transition pr-10 ${
                  errors.password
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-700 focus:border-blue-500"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 text-lg"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-bold transition mt-2 ${
              isLoading
                ? "bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 space-y-3 text-center text-gray-400">
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="text-green-400 hover:underline font-semibold">
              Create one
            </Link>
          </p>
       <p className="text-xs text-gray-500">
            Use demo credentials to test:{" "}
            <span className="text-gray-400">email: test@test.com</span>
          </p> 
        </div>
      </div>
    </div>
  );
};

export default Login;