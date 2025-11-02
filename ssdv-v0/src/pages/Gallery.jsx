// src/pages/Gallery.jsx
import React, { useState, useEffect, useContext } from "react";
import api from "../utils/api";
import { NotificationContext } from "../pages/NotificationContext";

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const res = await api.get("/upload/gallery");
      setImages(res.data.images || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
      setError(err.response?.data?.msg || "Failed to load gallery");
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imagePath, filename) => {
    const fullUrl = `http://localhost:5000${imagePath}`;
    const link = document.createElement("a");
    link.href = fullUrl;
    link.download = filename || "decoded_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (imageId, filename) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeleting(imageId);
      await api.delete(`/upload/image/${imageId}`);
      setImages(images.filter((img) => img._id !== imageId));
      alert("Image deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err.response?.data?.msg || "Failed to delete image");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Your Decoded Images</h1>
          <button
            onClick={fetchGallery}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-16 bg-black/30 rounded-2xl">
            <p className="text-2xl text-gray-300 mb-4">No decoded images yet</p>
            <p className="text-gray-400">
              Upload an SSTV audio file to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div
                key={image._id}
                className="bg-black/40 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition group"
              >
                {/* Image Preview */}
                <div className="relative overflow-hidden bg-gray-900 h-64">
                  <img
                    src={`http://localhost:5000${image.imagePath}`}
                    alt={image.originalFilename}
                    className="w-full h-full object-cover group-hover:scale-110 transition"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='20'%3EImage not found%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>

                {/* Image Info */}
                <div className="p-4">
                  <p className="text-sm text-gray-300 truncate mb-2">
                    {image.originalFilename}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Mode: <span className="text-blue-300">{image.decoderMode}</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    {new Date(image.uploadedAt).toLocaleDateString()} -{" "}
                    {new Date(image.uploadedAt).toLocaleTimeString()}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleDownload(
                          image.imagePath,
                          image.decodedFilename || "decoded_image.png"
                        )
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-bold transition"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(image._id, image.decodedFilename)}
                      disabled={deleting === image._id}
                      className={`flex-1 py-2 rounded text-sm font-bold transition ${
                        deleting === image._id
                          ? "bg-gray-600 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {deleting === image._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;