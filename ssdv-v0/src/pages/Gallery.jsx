
import React, { useState, useEffect, useContext } from "react";
import api from "../utils/api";
// import { NotificationContext } from "../pages/NotificationContext";

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  // helper: return stable id for image docs
  const getId = (img) => img?.id ?? img?._id ?? img?.docId ?? null;

  // helper: build a usable URL for image preview/download
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
    if (imagePath.startsWith("gs://")) {
      // convert gs://bucket/path to https URL (works if files are public or use signed urls elsewhere)
      const parts = imagePath.replace("gs://", "").split("/");
      const bucket = parts.shift();
      const filePath = parts.join("/");
      return `https://storage.googleapis.com/${bucket}/${filePath}`;
    }
    // assume server serves files at /uploads/... or stored paths
    return imagePath.startsWith("/") ? `http://localhost:5000${imagePath}` : `http://localhost:5000/${imagePath}`;
  };

  const parseUploadedAt = (uploadedAt) => {
    if (!uploadedAt) return null;
    // Firestore Timestamp
    if (typeof uploadedAt === "object" && typeof uploadedAt.toDate === "function") {
      return uploadedAt.toDate();
    }
    // ISO string or numeric
    const d = new Date(uploadedAt);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

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

   // download via fetch -> blob to avoid cross-origin "download" attribute limits
  const handleDownload = async (imagePath, filename) => {
    const url = getImageUrl(imagePath);
    if (!url) {
      alert("No file available to download");
      return;
    }
    try {
      const resp = await fetch(url, { method: "GET" });
      if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "decoded_image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed");
    }
  };

  const handleDelete = async (imageId, filename) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeleting(imageId);
      await api.delete(`/upload/image/${imageId}`);
      setImages((prev) => prev.filter((img) => getId(img) !== imageId));
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
            {images.map((image, index) => {
              const id = getId(image) ?? `idx-${index}`;
              const imgUrl = getImageUrl(image.localPath || image.imagePath || image.storageUrl);
              const uploadedDate = parseUploadedAt(image.uploadedAt);
              return (
                <div
                  key={id}
                  className="bg-black/40 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition group"
                >
                  {/* Image Preview */}
                  <div className="relative overflow-hidden bg-gray-900 h-64">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={image.originalFilename}
                        className="w-full h-full object-cover group-hover:scale-110 transition"
                        onError={(e) => {
                          e.target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='20'%3EImage not found%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No preview
                      </div>
                    )}
                  </div>

                  {/* Image Info */}
                  <div className="p-4">
                    <p className="text-sm text-gray-300 truncate mb-2">
                      {image.originalFilename || image.decodedFilename || "Unnamed"}
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      Mode: <span className="text-blue-300">{image.decoderMode || image.mode || "Unknown"}</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      {uploadedDate ? (
                        <>
                          {uploadedDate.toLocaleDateString()} - {uploadedDate.toLocaleTimeString()}
                        </>
                      ) : (
                        "Unknown upload time"
                      )}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleDownload(
                            image.imagePath || image.storageUrl,
                            image.decodedFilename || "decoded_image.png"
                          )
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-bold transition"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(id, image.decodedFilename)}
                        disabled={deleting === id}
                        className={`flex-1 py-2 rounded text-sm font-bold transition ${
                          deleting === id ? "bg-gray-600 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {deleting === id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;