// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// const userSchema = new mongoose.Schema(
//   {
//     username: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, lowercase: true },
//     password: { type: String, required: true },
//     callSign: { type: String, default: "" }, // ✅ optional field
//    // In your User.js model, add:
//    latitude: { type: Number, default: null },
//    longitude: { type: Number, default: null },
   
//   },
//   { timestamps: true }
// );

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// // Match entered password with hashed one
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// const User = mongoose.model("User", userSchema);
// export default User;
// import admin from "firebase-admin";

// const db = () => admin.firestore();

// export async function createUserProfile(uid, { username, email, callSign = "" }) {
//   await db().collection("users").doc(uid).set({
//     username,
//     email,
//     callSign,
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//   });
// }

// export async function getUserProfile(uid) {
//   const doc = await db().collection("users").doc(uid).get();
//   return doc.exists ? { id: doc.id, ...doc.data() } : null;
// }
import admin from "firebase-admin";

const db = () => admin.firestore();

export async function createUserProfile(uid, { username, email, callSign = "" } = {}) {
  if (!uid) throw new Error("uid required");
  const payload = {
    username: username || null,
    email: email || null,
    callSign: callSign || null,
    latitude: null,
    longitude: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db().collection("users").doc(uid).set(payload, { merge: true });
  const doc = await db().collection("users").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const doc = await db().collection("users").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function updateUserProfile(uid, updates = {}) {
  if (!uid) throw new Error("uid required");
  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await db().collection("users").doc(uid).set(updates, { merge: true });
  const doc = await db().collection("users").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}