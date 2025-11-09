// // backend/routes/authRoutes.js
// import authMiddleware from "../middleware/authMiddleware.js";
// import express from "express";
// import User from "../models/User.js";
// import jwt from "jsonwebtoken";

// const router = express.Router();

// // ==================== REGISTER USER ====================
// router.post("/register", async (req, res) => {
//   const { username, email, password, callSign } = req.body;

//   console.log("🛰️ Registration data received:", req.body);

//   try {
//     // Validate required fields
//     if (!username || !email || !password) {
//       return res.status(400).json({ msg: "Please fill all required fields" });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({ msg: "Password must be at least 6 characters" });
//     }

//     // Normalize email
//     const emailNormalized = email.toLowerCase();

//     // Check if user already exists
//     const existingUser = await User.findOne({ email: emailNormalized });
//     if (existingUser) return res.status(400).json({ msg: "User already exists" });

//     // Create new user (Mongoose will hash password automatically)
//     const newUser = new User({
//       username,
//       email: emailNormalized,
//       password, // plain password, hashing is done in User.js pre-save hook
//       callSign: callSign || "", // optional
//     });

//     await newUser.save();

//     // Generate JWT
//     const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
//       expiresIn: "1d",
//     });

//     // Respond
//     res.status(201).json({
//       token,
//       user: {
//         id: newUser._id,
//         username: newUser.username,
//         email: newUser.email,
//         callSign: newUser.callSign,
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// });

// // ==================== LOGIN USER ====================
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   console.log("🛰️ Login data received:", req.body);

//   try {
//     // Normalize email
//     const emailNormalized = email.toLowerCase();

//     // Find user
//     const user = await User.findOne({ email: emailNormalized });
//     if (!user) return res.status(400).json({ msg: "User not found" });

//     console.log("🔐 Password entered:", password);
//     console.log("🔒 Hashed password in DB:", user.password);

//     // Use mongoose method to compare password
//     const isMatch = await user.matchPassword(password);
//     console.log("✅ Password match:", isMatch);

//     if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

//     // Generate JWT
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "1d",
//     });

//     // Respond
//     res.json({
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         callSign: user.callSign,
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// });
// // ===== get current user =====
// router.get("/me", authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password -__v");
//     if (!user) return res.status(404).json({ msg: "User not found" });
//     res.json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// });

// // ===== update profile =====
// router.put("/update", authMiddleware, async (req, res) => {
//   try {
//     const { username, callSign, latitude, longitude } = req.body;
//     const updated = await User.findByIdAndUpdate(
//       req.user.id,
//       { username, callSign, latitude, longitude },
//       { new: true, runValidators: true }
//     ).select("-password -__v");
//     res.json({ user: updated });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// });

// export default router;
// ...existing code...
import express from "express";
import admin from "firebase-admin";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserProfile, updateUserProfile } from "../models/User.js"; // adjust path
import path from "path";
import fs from "fs";

const router = express.Router();


function extractIndexUrl(err) {
  const details = String(err.details || err.message || "");
  const m = details.match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : null;
}
// GET /api/upload/gallery
// Returns decoded images uploaded by the authenticated user.
router.get("/gallery", authMiddleware, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ msg: "Unauthorized" });

    const db = admin.firestore();
    // query by uploaderUid (avoid composite-index queries by not using orderBy on a different field)
    const snap = await db.collection("decodedImages").where("uploaderUid", "==", uid).get();

    const images = snap.docs.map((d) => {
      const data = d.data();
      // normalize timestamp -> ISO / millis
      const uploadedAt = data.uploadedAt && data.uploadedAt.toDate ? data.uploadedAt.toDate().toISOString() : data.uploadedAt || null;
      // Prefer localPath (server file) then storageUrl (GCS public/signed url), then legacy fields
      const resolvedPath = data.localPath || data.storageUrl || data.imagePath || data.imageUrl || null;
      return {
        _id: d.id,
        originalFilename: data.originalFilename || data.name || "",
        decodedFilename: data.decodedFilename || "",
        decoderMode: data.decoderMode || data.mode || "",
        // provide a single field the frontend expects
        imagePath: resolvedPath,
        // keep raw fields for debugging/consumers
        localPath: data.localPath || null,
        storageUrl: data.storageUrl || null,
        uploadedAt,
        size: data.size || null,
        uploaderUid: data.uploaderUid || null,
      };
    });

    // sort in-memory by uploadedAt desc (safe and avoids composite index)
    images.sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return tb - ta;
    });

    return res.json({ images });
  } catch (err) {
     console.error("GET /upload/gallery failed:", err);
    const createIndexUrl = extractIndexUrl(err);
    return res.status(500).json({
      msg: "Failed to fetch gallery",
      error: err.message,
      createIndexUrl,
    });
  }
});

// DELETE /api/upload/image/:id
// Deletes Firestore doc and attempts to delete associated file (local uploads or GCS)
router.delete("/image/:id", authMiddleware, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ msg: "Unauthorized" });

    const id = req.params.id;
    if (!id) return res.status(400).json({ msg: "Missing image id" });

    const db = admin.firestore();
    const docRef = db.collection("decodedImages").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ msg: "Image not found" });

    const data = doc.data();
    if (data.uploaderUid && data.uploaderUid !== uid) {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const imagePath = data.imagePath || data.imageUrl || "";
    // delete Firestore document
    await docRef.delete();

    // Delete local file if path looks like a local uploads path (e.g. /uploads/decoded/...)
    try {
      if (imagePath && (imagePath.startsWith("/uploads") || imagePath.startsWith("uploads") || imagePath.includes("decoded"))) {
        // build absolute path relative to project root
        const maybeRelative = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
        const candidate = path.join(process.cwd(), maybeRelative);
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
        }
      } else if (imagePath && imagePath.startsWith("gs://")) {
        // Delete from Google Cloud Storage bucket if stored as gs://bucketName/path
        const bucket = admin.storage().bucket();
        // derive file path within bucket
        const parts = imagePath.replace("gs://", "").split("/");
        parts.shift(); // remove bucket name
        const filePath = parts.join("/");
        if (filePath) {
          try {
            await bucket.file(filePath).delete();
          } catch (e) {
            // log and continue
            console.warn("Failed to delete file from storage:", e.message || e);
          }
        }
      }
    } catch (fileErr) {
      console.warn("Error while deleting associated file:", fileErr);
    }

    return res.json({ msg: "Image deleted" });
  } catch (err) {
    console.error("DELETE /upload/image/:id failed:", err);
    return res.status(500).json({ msg: "Delete failed", error: err.message || err.toString() });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Prefer model helper (reads Firestore) so response shape is consistent
    const profile = await getUserProfile(uid);

    res.json({
      uid,
      email: req.user.email || null,
      username: profile?.username || null,
      callSign: profile?.callSign || null,
      latitude: profile?.latitude ?? null,
      longitude: profile?.longitude ?? null,
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ===== update profile =====
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { username, callSign, latitude, longitude } = req.body;

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (callSign !== undefined) updates.callSign = callSign;
    // store numeric coords when provided
    if (latitude !== undefined && latitude !== null && latitude !== "") updates.latitude = Number(latitude);
    if (longitude !== undefined && longitude !== null && longitude !== "") updates.longitude = Number(longitude);

    const updated = await updateUserProfile(uid, updates);
    res.json({ user: updated });
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});
 
// POST /api/auth/register
router.post("/register", async (req, res) => {
  // safe extraction to avoid "variable is not defined" ReferenceErrors
  const { username, email, password, callSign } = req.body || {};
  // read lat/long from body defensively
  let latitude = req.body?.latitude ?? null;
  let longitude = req.body?.longitude ?? null;

  if (!email || !password || !username) {
    return res.status(400).json({ message: "username, email and password are required" });
  }

  // normalize empty-string inputs to null and coerce numeric values safely
  const parseCoord = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  latitude = parseCoord(latitude);
  longitude = parseCoord(longitude);

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    const db = admin.firestore();
    await db.collection("users").doc(userRecord.uid).set({
      username,
      email,
      callSign: callSign || null,
      latitude,
      longitude,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ message: "User registered", uid: userRecord.uid });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({ message: "Email already in use" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ message: "Registration failed", error: err.message || err.toString() });
  }
});
// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const API_KEY = process.env.FIREBASE_API_KEY;
  if (!API_KEY) return res.status(500).json({ message: "FIREBASE_API_KEY not configured" });
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await resp.json();
    if (!resp.ok) return res.status(400).json({ message: data.error?.message || "Login failed", raw: data });

    return res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      uid: data.localId,
      email: data.email,
      expiresIn: data.expiresIn,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
});

export default router;
// ...existing code...