// src/pages/Upload.jsx
import React, { useState, useRef, useContext } from "react";
import api from "../utils/api";
import { NotificationContext } from "../pages/NotificationContext";

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decodedUrl, setDecodedUrl] = useState(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const eventSourceRef = useRef(null);
  const { addNotification } = useContext(NotificationContext);

  const handleFile = (e) => {
    setFile(e.target.files[0]);
    setDecodedUrl(null);
    setError("");
    setLogs([]);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose an audio file first");
      return;
    }

    setIsLoading(true);
    setError("");
    setLogs([]);
    setProgress(0);
    setDecodedUrl(null);

    console.log("🔍 DEBUG: Starting upload, addNotification function:", typeof addNotification);

    try {
      // Create FormData with file
      const formData = new FormData();
      formData.append("audio", file);

      // First, upload the file using the regular API
      console.log("Uploading file...");
      const token = localStorage.getItem("token");

      // Make POST request to trigger decoder
      const response = await fetch("http://localhost:5000/api/upload/audio-stream", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      // Read the response as text stream (SSE)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          // SSE format is "data: message"
          if (line.startsWith("data: ")) {
            const message = line.slice(6); // Remove "data: "

            // Try to parse as JSON (final result)
            if (message.startsWith("{") && message.endsWith("}")) {
              try {
                const data = JSON.parse(message);
                if (data.imageUrl) {
                  const fullUrl = `http://localhost:5000${data.imageUrl}`;
                  setDecodedUrl(fullUrl);
                  setLogs((prev) => [
                    ...prev,
                    "✅ Decode Complete!",
                  ]);
                }
              } catch (err) {
                console.error("Failed to parse JSON message:", message);
              }
            } else if (message.trim()) {
              // Regular log message
              setLogs((prev) => [...prev, message]);

              // Try to extract progress percentage
              const percentMatch = message.match(/(\d+)%/);
              if (percentMatch) {
                setProgress(parseInt(percentMatch[1]));
              }
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
      addNotification(`❌ Upload failed: ${err.message}`, "error", 5000);
      setIsLoading(false);
    }

    // Cleanup
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-2xl mx-auto bg-black/30 p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">Upload SSTV Audio to Decode</h2>

        {/* File Input */}
        <div className="mb-4">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFile}
            disabled={isLoading}
            className="w-full p-2 bg-gray-800 rounded border border-gray-700"
          />
          <p className="text-sm text-gray-400 mt-2">
            Supported: WAV, OGG, FLAC, MP3, M4A, AIFF
          </p>
        </div>

        {/* Upload Button */}
        <div className="mb-4">
          <button
            onClick={handleUpload}
            disabled={isLoading || !file}
            className={`w-full py-2 rounded font-bold transition ${
              isLoading || !file
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Decoding..." : "Upload & Decode"}
          </button>
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 h-4 rounded overflow-hidden">
              <div
                className="bg-green-500 h-4 rounded transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Logs Display */}
        {logs.length > 0 && (
          <div className="mb-4 max-h-96 overflow-y-auto bg-black/50 p-3 rounded">
            <h3 className="font-bold mb-2 text-sm">Decoder Output</h3>
            <div className="text-xs font-mono space-y-1">
              {logs.map((line, i) => (
                <div key={i} className="text-gray-300">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Decoded Image Display */}
        {decodedUrl && (
          <div className="mt-6 border border-green-600 rounded p-4 bg-green-900/20">
            <h3 className="font-bold mb-3 text-green-300">✅ Decoded Image</h3>
            <img
              src={decodedUrl}
              alt="decoded"
              className="w-full rounded shadow-md mb-3 border border-green-600"
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='10' y='50'%3EImage failed to load%3C/text%3E%3C/svg%3E";
              }}
            />
            <p className="text-sm text-gray-300 mb-4">Image saved to: {decodedUrl}</p>
            
            {/* Download Button */}
            <button
              onClick={() => {
                const filename = file?.name?.replace(/\.[^/.]+$/, "") + "_decoded.png" || "decoded_image.png";
                const link = document.createElement("a");
                link.href = decodedUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-bold transition"
            >
              Download Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;