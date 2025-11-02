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

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password, callSign } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ message: "username, email and password are required" });
  }

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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ message: "User registered", uid: userRecord.uid });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({ message: "Email already in use" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ message: "Registration failed", error: err.message });
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