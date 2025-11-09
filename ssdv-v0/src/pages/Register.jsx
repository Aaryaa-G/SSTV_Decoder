// src/pages/Register.jsx
import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { NotificationContext } from "../pages/NotificationContext";

const Register = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    callSign: "",
    latitude: "",
    longitude: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { addNotification } = useContext(NotificationContext);

  const validatePassword = (password) => {
    const passwordErrors = [];

    if (password.length < 8) {
      passwordErrors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push("One uppercase letter");
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push("One number");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      passwordErrors.push("One symbol (!@#$%^&* etc)");
    }

    return passwordErrors;
  };

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

    if (!form.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    const passwordErrors = validatePassword(form.password);
    if (passwordErrors.length > 0) {
      newErrors.password = `Password must have: ${passwordErrors.join(", ")}`;
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addNotification("Please fix the errors below", "error", 4000);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Sending registration data:", form);

      const res = await axios.post("http://localhost:5000/api/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
        callSign: form.callSign,
        latitude: form.latitude,
        longitude: form.longitude,
      });

      console.log("Registration successful:", res.data);
      addNotification("Registration successful! Redirecting to login...", "success", 3000);
      
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Registration failed:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.msg || "Registration failed!";
      addNotification(errorMsg, "error", 5000);
      setErrors({ submit: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(form.password);
  const isPasswordValid = form.password && passwordValidation.length === 0;
  const isPasswordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-4">
      <div className="bg-black/40 p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-700/50">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded">
            <p className="text-red-300 text-sm">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              className={`w-full p-3 rounded bg-gray-800 border focus:outline-none transition ${
                errors.username
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-700 focus:border-blue-500"
              }`}
              required
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>

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
                placeholder="Enter password"
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
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {form.password && (
              <div className="mt-2 space-y-1">
                {passwordValidation.length > 0 && (
                  <div className="text-xs text-gray-400">
                    <p className="font-semibold mb-1">Password must have:</p>
                    {passwordValidation.map((req, idx) => (
                      <p key={idx} className="text-red-400">• {req}</p>
                    ))}
                  </div>
                )}
                {isPasswordValid && (
                  <p className="text-green-400 text-xs font-semibold">✓ Password is strong</p>
                )}
              </div>
            )}
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`w-full p-3 rounded bg-gray-800 border focus:outline-none transition pr-10 ${
                  errors.confirmPassword
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-700 focus:border-blue-500"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {form.confirmPassword && (
              <div className="mt-2">
                {!isPasswordsMatch && (
                  <p className="text-red-400 text-xs">✗ Passwords do not match</p>
                )}
                {isPasswordsMatch && (
                  <p className="text-green-400 text-xs font-semibold">✓ Passwords match</p>
                )}
              </div>
            )}
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Call Sign (Optional) */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Call Sign (Optional)</label>
            <input
              type="text"
              name="callSign"
              placeholder="e.g., N0CALL"
              value={form.callSign}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Latitude (Optional) */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block">Latitude (Optional)</label>
        <input
          type="number"
          name="latitude"
          placeholder="e.g., 37.7749"
          value={form.latitude}
          onChange={handleChange}
          step="0.0001"
          className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition"
        />
      </div>

      {/* Longitude (Optional) */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block">Longitude (Optional)</label>
        <input
          type="number"
          name="longitude"
          placeholder="e.g., -122.4194"
          value={form.longitude}
          onChange={handleChange}
         step="0.0001"
          className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition"
        />
     </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isPasswordValid || !isPasswordsMatch}
            className={`w-full py-3 rounded-lg font-bold transition mt-2 ${
              isLoading || !isPasswordValid || !isPasswordsMatch
                ? "bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:underline font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;