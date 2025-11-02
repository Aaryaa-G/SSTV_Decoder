// import User from "../models/User.js";
// import jwt from "jsonwebtoken";

// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
// };

// // REGISTER USER
// export const registerUser = async (req, res) => {
//   try {
//     const { username, email, password, callSign } = req.body;

//     const userExists = await User.findOne({ email });
//     if (userExists) return res.status(400).json({ message: "User already exists" });

//     const user = await User.create({
//       username,
//       email,
//       password,
//       callSign: callSign || "",
//     });

//     const token = generateToken(user._id);
//     res.status(201).json({
//       _id: user._id,
//       username: user.username,
//       email: user.email,
//       callSign: user.callSign,
//       token,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // LOGIN USER
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: "Invalid credentials" });

//     const isMatch = await user.matchPassword(password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

//     const token = generateToken(user._id);
//     res.json({
//       _id: user._id,
//       username: user.username,
//       email: user.email,
//       callSign: user.callSign,
//       token,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // LOGOUT USER
// export const logoutUser = async (req, res) => {
//   res.status(200).json({ message: "User logged out successfully" });
// };
// import admin from "firebase-admin";

// // NOTE: this controller uses the Firebase Auth REST API for email/password sign-in.
// // Ensure FIREBASE_API_KEY is set in your .env for login to return idToken/refreshToken.
// const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// async function signInWithPassword(email, password) {
//   if (!FIREBASE_API_KEY) throw new Error("FIREBASE_API_KEY not configured");
//   const resp = await fetch(
//     `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ email, password, returnSecureToken: true }),
//     }
//   );
//   const data = await resp.json();
//   if (!resp.ok) {
//     const err = new Error(data.error?.message || "Login failed");
//     err.raw = data;
//     throw err;
//   }
//   return data; // contains idToken, refreshToken, localId (uid), email, expiresIn
// }

// // REGISTER USER
// export const registerUser = async (req, res) => {
//   try {
//     const { username, email, password, callSign } = req.body;
//     if (!username || !email || !password) {
//       return res.status(400).json({ message: "username, email and password are required" });
//     }

//     // check if user already exists
//     try {
//       await admin.auth().getUserByEmail(email);
//       return res.status(400).json({ message: "User already exists" });
//     } catch (e) {
//       // getUserByEmail throws if not found - proceed
//       if (e.code && e.code !== "auth/user-not-found") {
//         console.warn("getUserByEmail check error:", e);
//       }
//     }

//     // create auth user
//     const userRecord = await admin.auth().createUser({
//       email,
//       password,
//       displayName: username,
//     });

//     // create Firestore profile (best-effort)
//     try {
//       const db = admin.firestore();
//       await db.collection("users").doc(userRecord.uid).set({
//         username,
//         email,
//         callSign: callSign || null,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });
//     } catch (fireErr) {
//       console.warn("Firestore write failed — profile not saved. Continuing. Error:", fireErr.message || fireErr);
//     }

//     // If API key available, sign in and return idToken
//     if (FIREBASE_API_KEY) {
//       try {
//         const authData = await signInWithPassword(email, password);
//         return res.status(201).json({
//           message: "User registered",
//           uid: userRecord.uid,
//           idToken: authData.idToken,
//           refreshToken: authData.refreshToken,
//           expiresIn: authData.expiresIn,
//           email: authData.email,
//         });
//       } catch (signErr) {
//         // registration succeeded but sign-in failed
//         return res.status(201).json({ message: "User registered (signin failed)", uid: userRecord.uid });
//       }
//     }

//     return res.status(201).json({ message: "User registered", uid: userRecord.uid });
//   } catch (err) {
//     console.error("Register error:", err);
//     // map common firebase auth errors
//     if (err.code === "auth/email-already-exists") {
//       return res.status(400).json({ message: "Email already in use" });
//     }
//     return res.status(500).json({ message: "Registration failed", error: err.message || err });
//   }
// };

// // LOGIN USER
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ message: "email and password are required" });
//     if (!FIREBASE_API_KEY) return res.status(500).json({ message: "FIREBASE_API_KEY not configured" });

//     const authData = await signInWithPassword(email, password);

//     // optional: fetch profile from Firestore
//     let profile = null;
//     try {
//       const db = admin.firestore();
//       const doc = await db.collection("users").doc(authData.localId).get();
//       if (doc.exists) profile = doc.data();
//     } catch (e) {
//       console.warn("Failed to load user profile:", e.message || e);
//     }

//     return res.json({
//       idToken: authData.idToken,
//       refreshToken: authData.refreshToken,
//       uid: authData.localId,
//       email: authData.email,
//       expiresIn: authData.expiresIn,
//       profile,
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     const msg = err.raw?.error?.message || err.message || "Login failed";
//     return res.status(400).json({ message: msg, raw: err.raw || null });
//   }
// };

// // LOGOUT USER
// export const logoutUser = async (req, res) => {
//   // With Firebase client-side sign-out is typical. Server-side revoke can be done with admin.auth().revokeRefreshTokens(uid)
//   // If client includes uid in req (and is authorized), you can revoke refresh tokens:
//   const uid = req.user?.uid || req.body?.uid || null;
//   if (uid) {
//     try {
//       await admin.auth().revokeRefreshTokens(uid);
//       return res.status(200).json({ message: "User logged out (tokens revoked)" });
//     } catch (err) {
//       console.warn("Failed to revoke tokens:", err);
//     }
//   }
//   return res.status(200).json({ message: "User logged out" });
// };


// ...existing code...
import admin from "firebase-admin";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

async function signInWithPassword(email, password) {
  if (!FIREBASE_API_KEY) throw new Error("FIREBASE_API_KEY not configured");
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data.error?.message || "Login failed");
    err.raw = data;
    throw err;
  }
  return data;
}

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, callSign } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }

    // check if user already exists
    try {
      await admin.auth().getUserByEmail(email);
      return res.status(400).json({ message: "User already exists" });
    } catch (e) {
      if (e.code && e.code !== "auth/user-not-found") {
        console.warn("getUserByEmail check error:", e);
      }
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    try {
      const db = admin.firestore();
      await db.collection("users").doc(userRecord.uid).set({
        username,
        email,
        callSign: callSign || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (fireErr) {
      console.warn("Firestore write failed — profile not saved. Continuing. Error:", fireErr.message || fireErr);
    }

    // If API key available, sign in and return idToken
    if (FIREBASE_API_KEY) {
      try {
        const authData = await signInWithPassword(email, password);
        const userObj = {
          uid: userRecord.uid,
          email: authData.email || email,
          username,
          profile: null,
        };
        return res.status(201).json({
          message: "User registered",
          uid: userRecord.uid,
          idToken: authData.idToken,
          refreshToken: authData.refreshToken,
          expiresIn: authData.expiresIn,
          token: authData.idToken, // backward-compatible
          user: userObj, // backward-compatible
        });
      } catch (signErr) {
        return res.status(201).json({
          message: "User registered (signin failed)",
          uid: userRecord.uid,
          token: null,
          user: { uid: userRecord.uid, email, username },
        });
      }
    }

    return res.status(201).json({ message: "User registered", uid: userRecord.uid, token: null, user: { uid: userRecord.uid, email, username } });
  } catch (err) {
    console.error("Register error:", err);
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({ message: "Email already in use" });
    }
    return res.status(500).json({ message: "Registration failed", error: err.message || err });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });
    if (!FIREBASE_API_KEY) return res.status(500).json({ message: "FIREBASE_API_KEY not configured" });

    const authData = await signInWithPassword(email, password);

    let profile = null;
    try {
      const db = admin.firestore();
      const doc = await db.collection("users").doc(authData.localId).get();
      if (doc.exists) profile = doc.data();
    } catch (e) {
      console.warn("Failed to load user profile:", e.message || e);
    }

    const userObj = { uid: authData.localId, email: authData.email, profile };

    return res.json({
      idToken: authData.idToken,
      refreshToken: authData.refreshToken,
      uid: authData.localId,
      email: authData.email,
      expiresIn: authData.expiresIn,
      profile,
      token: authData.idToken, // backward-compatible
      user: userObj, // backward-compatible
    });
  } catch (err) {
    console.error("Login error:", err);
    const msg = err.raw?.error?.message || err.message || "Login failed";
    return res.status(400).json({ message: msg, raw: err.raw || null });
  }
};

// LOGOUT USER
export const logoutUser = async (req, res) => {
  const uid = req.user?.uid || req.body?.uid || null;
  if (uid) {
    try {
      await admin.auth().revokeRefreshTokens(uid);
      return res.status(200).json({ message: "User logged out (tokens revoked)" });
    } catch (err) {
      console.warn("Failed to revoke tokens:", err);
    }
  }
  return res.status(200).json({ message: "User logged out" });
};
// ...existing code...