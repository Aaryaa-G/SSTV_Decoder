// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import api from "../utils/api";

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    callSign: "",
    latitude: "",
    longitude: "",
  });

  // Map coordinates
  const [mapLocation, setMapLocation] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      setUser(res.data);
      setFormData({
        username: res.data.username,
        email: res.data.email,
        callSign: res.data.callSign || "",
        latitude: res.data.latitude || "",
        longitude: res.data.longitude || "",
      });
      
      // Set initial map location if coordinates exist
      if (res.data.latitude && res.data.longitude) {
        setMapLocation({
          lat: parseFloat(res.data.latitude),
          lon: parseFloat(res.data.longitude),
        });
      }
      setError("");
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError(err.response?.data?.msg || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleShowMap = () => {
    if (!formData.latitude || !formData.longitude) {
      setError("Please enter both latitude and longitude");
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      setError("Please enter valid latitude and longitude values");
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError("Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180");
      return;
    }

    setMapLocation({ lat, lon });
    setShowMap(true);
    setError("");
  };

  const handleSaveProfile = async () => {
    try {
      setError("");
      
      // Validate coordinates if provided
      if (formData.latitude || formData.longitude) {
        if (!formData.latitude || !formData.longitude) {
          setError("Please provide both latitude and longitude, or leave both empty");
          return;
        }
        
        const lat = parseFloat(formData.latitude);
        const lon = parseFloat(formData.longitude);
        
        if (isNaN(lat) || isNaN(lon)) {
          setError("Please enter valid latitude and longitude values");
          return;
        }
      }

      const res = await api.put("/auth/update", {
        username: formData.username,
        callSign: formData.callSign,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });

      setUser(res.data.user);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err.response?.data?.msg || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      username: user.username,
      email: user.email,
      callSign: user.callSign || "",
      latitude: user.latitude || "",
      longitude: user.longitude || "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">User Profile</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 border border-gray-700/50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Profile Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold transition"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!isEditing ? (
                // Display Mode
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm">Username</label>
                    <p className="text-xl font-bold text-white">{user?.username}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Email</label>
                    <p className="text-lg text-gray-200">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Call Sign</label>
                    <p className="text-lg text-gray-200">{user?.callSign || "Not set"}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <label className="text-gray-400 text-sm">Location</label>
                    {user?.latitude && user?.longitude ? (
                      <div>
                        <p className="text-sm text-gray-200">
                          Lat: <span className="font-bold">{user.latitude}</span>
                        </p>
                        <p className="text-sm text-gray-200">
                          Lon: <span className="font-bold">{user.longitude}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-400">Not set</p>
                    )}
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Email (Read-only)</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full p-2 bg-gray-700 rounded border border-gray-700 text-gray-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Call Sign</label>
                    <input
                      type="text"
                      name="callSign"
                      value={formData.callSign}
                      onChange={handleChange}
                      placeholder="e.g., N0CALL"
                      className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="font-bold text-lg mb-3">Station Location</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Latitude</label>
                        <input
                          type="number"
                          name="latitude"
                          value={formData.latitude}
                          onChange={handleChange}
                          placeholder="-90 to 90"
                          step="0.0001"
                          className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Longitude</label>
                        <input
                          type="number"
                          name="longitude"
                          value={formData.longitude}
                          onChange={handleChange}
                          placeholder="-180 to 180"
                          step="0.0001"
                          className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleShowMap}
                      className="mt-3 w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-bold transition"
                    >
                      Show on Map
                    </button>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold transition"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-bold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Section */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 border border-gray-700/50 rounded-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-4">Station Location Map</h2>

              {showMap && mapLocation ? (
                <div className="rounded-lg overflow-hidden border border-gray-700 mb-4" style={{ height: "300px" }}>
                  <MapContainer
                    center={[mapLocation.lat, mapLocation.lon]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={[mapLocation.lat, mapLocation.lon]}>
                      <Popup>
                        <div>
                          <p className="font-bold">{user?.callSign || "Station"}</p>
                          <p className="text-sm">
                            {mapLocation.lat.toFixed(4)}, {mapLocation.lon.toFixed(4)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg h-64 flex items-center justify-center border border-dashed border-gray-700">
                  <p className="text-gray-400 text-center">
                    {isEditing
                      ? "Enter coordinates and click 'Show on Map'"
                      : "No location set yet"}
                  </p>
                </div>
              )}

              {mapLocation && (
                <div className="bg-blue-900/30 border border-blue-500/30 rounded p-3 text-sm">
                  <p className="text-blue-300">
                    <span className="font-bold">Latitude:</span> {mapLocation.lat.toFixed(6)}
                  </p>
                  <p className="text-blue-300">
                    <span className="font-bold">Longitude:</span> {mapLocation.lon.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;