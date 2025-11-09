import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
    if (imagePath.startsWith("gs://")) {
      const parts = imagePath.replace("gs://", "").split("/");
      const bucket = parts.shift();
      const filePath = parts.join("/");
      return `https://storage.googleapis.com/${bucket}/${filePath}`;
    }
    return imagePath.startsWith("/") ? `http://localhost:5000${imagePath}` : `http://localhost:5000/${imagePath}`;
  };

  const downloadBlobAndSave = async (url, filename) => {
    if (!url) return alert("No file URL");
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "decoded_image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed");
    }
  };

  const getId = (img, idx) => img?.id ?? img?._id ?? img?.docId ?? `idx-${idx}`;

  const parseUploadedAt = (uploadedAt) => {
    if (!uploadedAt) return null;
    if (typeof uploadedAt === "object" && typeof uploadedAt.toDate === "function") return uploadedAt.toDate();
    const d = new Date(uploadedAt);
    return isNaN(d.getTime()) ? null : d;
  };

  const [stats, setStats] = useState({
    totalImages: 0,
    totalSize: 0,
    modeBreakdown: {},
    recentImages: [],
    mostUsedMode: "",
  });

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get("/auth/me");
      setUserData(userRes.data);

      const galleryRes = await api.get("/upload/gallery");
      const allImages = galleryRes.data?.images ?? [];
      setImages(allImages);
      calculateStats(allImages);
      setError("");
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err?.response?.data?.msg || err?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (imageList) => {
    const modeCount = {};
    const normalized = imageList.map((img) => {
      const uploaded = parseUploadedAt(img.uploadedAt);
      return { ...img, __uploadedAtTs: uploaded ? uploaded.getTime() : 0 };
    });
    normalized.sort((a, b) => b.__uploadedAtTs - a.__uploadedAtTs);

    normalized.forEach((img) => {
      const mode = img.decoderMode || img.mode || "Unknown";
      modeCount[mode] = (modeCount[mode] || 0) + 1;
    });

    const totalSizeKB = imageList.reduce((acc, it) => acc + (it.size ? Number(it.size) / 1024 : 0), 0);

    const mostUsedMode =
      Object.keys(modeCount).length > 0
        ? Object.keys(modeCount).reduce((a, b) => (modeCount[a] > modeCount[b] ? a : b))
        : "N/A";

    setStats({
      totalImages: imageList.length,
      totalSize: Math.round(totalSizeKB),
      modeBreakdown: modeCount,
      recentImages: normalized.slice(0, 10),
      mostUsedMode,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/40 border border-blue-500/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Total Decoded Images</p>
            <p className="text-4xl font-bold text-blue-400">{stats.totalImages}</p>
            <p className="text-xs text-gray-500 mt-2">All time</p>
          </div>

          <div className="bg-black/40 border border-green-500/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Storage Used (KB)</p>
            <p className="text-4xl font-bold text-green-400">{stats.totalSize}</p>
            <p className="text-xs text-gray-500 mt-2">Approximate</p>
          </div>

          <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Most Used Mode</p>
            <p className="text-2xl font-bold text-purple-400">{stats.mostUsedMode}</p>
            <p className="text-xs text-gray-500 mt-2">{stats.modeBreakdown[stats.mostUsedMode] || 0} decodings</p>
          </div>

          <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Call Sign</p>
            <p className="text-2xl font-bold text-yellow-400">{userData?.callSign || "Not set"}</p>
            <p className="text-xs text-gray-500 mt-2">Amateur Radio</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Decoded Images</h2>
            <Link to="/gallery" className="text-blue-400 hover:text-blue-300 text-sm font-bold">
              View All →
            </Link>
          </div>

          {stats.recentImages.length === 0 ? (
            <div className="text-center py-12 bg-black/30 rounded-lg">
              <p className="text-gray-400 mb-4">No decoded images yet</p>
              <Link to="/upload" className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold transition">
                Start Decoding
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
               {stats.recentImages.map((img, idx) => {
               const url = getImageUrl(img.localPath || img.imagePath || img.storageUrl || img.imageUrl);
                const uploaded = parseUploadedAt(img.uploadedAt);
                return (
                  <div key={getId(img, idx)} className="bg-black/40 rounded-lg overflow-hidden border border-gray-700/50 hover:border-blue-500 transition group">
                    <div className="relative overflow-hidden bg-gray-900 h-32">
                      {url ? (
                        <img
                          src={url}
                          alt={img.originalFilename || img.decodedFilename || "decoded"}
                          className="w-full h-full object-cover group-hover:scale-110 transition"
                          onError={(e) => {
                            e.currentTarget.src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23333' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage not found%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">Image not available</div>
                      )}

                      {url && (
                        <button
                          onClick={() => downloadBlobAndSave(url, img.decodedFilename || img.originalFilename)}
                          className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs hover:bg-black/70"
                        >
                          Download
                        </button>
                      )}
                    </div>

                    <div className="p-2">
                      <p className="text-xs text-gray-300 truncate">{img.originalFilename || img.decodedFilename || "Unnamed"}</p>
                      <p className="text-xs text-gray-500">{uploaded ? uploaded.toLocaleDateString() : "Unknown"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/upload" className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-center transition">Upload New Audio</Link>
          <Link to="/gallery" className="bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-center transition">View Full Gallery</Link>
          <Link to="/profile" className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-center transition">Edit Profile</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;