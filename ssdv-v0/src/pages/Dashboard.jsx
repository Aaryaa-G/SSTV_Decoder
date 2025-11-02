// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    totalImages: 0,
    totalSize: 0,
    modeBreakdown: {},
    recentImages: [],
    mostUsedMode: "",
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user data
      const userRes = await api.get("/auth/me");
      setUserData(userRes.data);

      // Fetch gallery
      const galleryRes = await api.get("/upload/gallery");
      const allImages = galleryRes.data.images || [];
      setImages(allImages);

      // Calculate statistics
      calculateStats(allImages);
      setError("");
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.response?.data?.msg || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (imageList) => {
    const modeCount = {};
    let totalSize = 0;
    const recent = imageList.slice(0, 5);

    imageList.forEach((img) => {
      modeCount[img.decoderMode] = (modeCount[img.decoderMode] || 0) + 1;
    });

    // Calculate total size (rough estimate: average PNG is ~200-500KB)
    totalSize = imageList.length * 350; // KB (average)

    const mostUsedMode =
      Object.keys(modeCount).length > 0
        ? Object.keys(modeCount).reduce((a, b) =>
            modeCount[a] > modeCount[b] ? a : b
          )
        : "N/A";

    setStats({
      totalImages: imageList.length,
      totalSize: totalSize,
      modeBreakdown: modeCount,
      recentImages: recent,
      mostUsedMode: mostUsedMode,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-300">
            Welcome back, <span className="text-blue-400 font-bold">{userData?.username}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Images */}
          <div className="bg-black/40 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500 transition">
            <p className="text-gray-400 text-sm mb-2">Total Decoded Images</p>
            <p className="text-4xl font-bold text-blue-400">{stats.totalImages}</p>
            <p className="text-xs text-gray-500 mt-2">All time</p>
          </div>

          {/* Storage Used */}
          <div className="bg-black/40 border border-green-500/30 rounded-lg p-6 hover:border-green-500 transition">
            <p className="text-gray-400 text-sm mb-2">Storage Used</p>
            <p className="text-4xl font-bold text-green-400">
              {(stats.totalSize / 1024).toFixed(1)} MB
            </p>
            <p className="text-xs text-gray-500 mt-2">Approximate</p>
          </div>

          {/* Most Used Mode */}
          <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500 transition">
            <p className="text-gray-400 text-sm mb-2">Most Used Mode</p>
            <p className="text-2xl font-bold text-purple-400">{stats.mostUsedMode}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.modeBreakdown[stats.mostUsedMode] || 0} decodings
            </p>
          </div>

          {/* Call Sign */}
          <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-6 hover:border-yellow-500 transition">
            <p className="text-gray-400 text-sm mb-2">Call Sign</p>
            <p className="text-2xl font-bold text-yellow-400">
              {userData?.callSign || "Not set"}
            </p>
            <p className="text-xs text-gray-500 mt-2">Amateur Radio</p>
          </div>
        </div>

        {/* Mode Breakdown & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* SSTV Mode Breakdown */}
          <div className="lg:col-span-1 bg-black/40 border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">SSTV Mode Breakdown</h2>
            {Object.keys(stats.modeBreakdown).length === 0 ? (
              <p className="text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.modeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mode, count]) => (
                    <div key={mode}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-300">{mode}</span>
                        <span className="text-sm font-bold text-blue-400">{count}</span>
                      </div>
                      <div className="w-full bg-gray-700 h-2 rounded overflow-hidden">
                        <div
                          className="bg-blue-500 h-2 rounded"
                          style={{
                            width: `${(count / stats.totalImages) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-black/40 border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Decodings</h2>
            {stats.recentImages.length === 0 ? (
              <p className="text-gray-400">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.recentImages.map((img) => (
                  <div
                    key={img._id}
                    className="flex items-center justify-between p-3 bg-black/40 rounded border border-gray-700/30 hover:border-blue-500/50 transition"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-mono text-gray-200 truncate">
                        {img.originalFilename}
                      </p>
                      <p className="text-xs text-gray-400">
                        {img.decoderMode} •{" "}
                        {new Date(img.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded ml-2">
                      {img.decoderMode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Decoded Images Preview */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Decoded Images</h2>
            <Link
              to="/gallery"
              className="text-blue-400 hover:text-blue-300 text-sm font-bold"
            >
              View All →
            </Link>
          </div>

          {stats.recentImages.length === 0 ? (
            <div className="text-center py-12 bg-black/30 rounded-lg">
              <p className="text-gray-400 mb-4">No decoded images yet</p>
              <Link
                to="/upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold transition"
              >
                Start Decoding
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.recentImages.map((img) => (
                <div
                  key={img._id}
                  className="bg-black/40 rounded-lg overflow-hidden border border-gray-700/50 hover:border-blue-500 transition group"
                >
                  <div className="relative overflow-hidden bg-gray-900 h-32">
                    <img
                      src={`http://localhost:5000${img.imagePath}`}
                      alt={img.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-110 transition"
                      onError={(e) => {
                        e.target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23333' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage not found%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-300 truncate">
                      {img.originalFilename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(img.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-center transition"
          >
            Upload New Audio
          </Link>
          <Link
            to="/gallery"
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-center transition"
          >
            View Full Gallery
          </Link>
          <Link
            to="/profile"
            className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-center transition"
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;