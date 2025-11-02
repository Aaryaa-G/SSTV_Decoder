// // backend/models/DecodedImage.js
// import mongoose from "mongoose";

// const DecodedImageSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     originalFilename: {
//       type: String,
//       required: true,
//     },
//     decodedFilename: {
//       type: String,
//       required: true,
//     },
//     imagePath: {
//       type: String,
//       required: true,
//     },
//     decoderMode: {
//       type: String,
//       enum: ["Martin 1", "Martin 2", "Scottie 1", "Scottie 2", "Scottie DX", "Robot 36", "Robot 72", "PD 120", "Unknown"],
//       default: "Unknown",
//     },
//     uploadedAt: {
//       type: Date,
//       default: Date.now,
//       index: true,
//     },
//     description: {
//       type: String,
//       default: "",
//     },
//     tags: [String],
//   },
//   { timestamps: true }
// );

// const DecodedImage = mongoose.model("DecodedImage", DecodedImageSchema);

// export default DecodedImage;

import admin from "firebase-admin";

const db = () => admin.firestore();

export async function addDecodedImage(data = {}) {
  // data: { uploaderUid, originalFilename, decodedFilename, localPath, storageUrl, decoderMode }
  const docRef = await db().collection("decodedImages").add({
    uploaderUid: data.uploaderUid || null,
    originalFilename: data.originalFilename || null,
    decodedFilename: data.decodedFilename || null,
    localPath: data.localPath || null,
    storageUrl: data.storageUrl || null,
    decoderMode: data.decoderMode || "Unknown",
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() };
}

export async function getDecodedImagesByUid(uid, limit = 50) {
  if (!uid) return [];
  const q = db().collection("decodedImages").where("uploaderUid", "==", uid).orderBy("uploadedAt", "desc").limit(limit);
  const snap = await q.get();
  const results = [];
  snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
  return results;
}

export async function getDecodedImageById(id) {
  const doc = await db().collection("decodedImages").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function deleteDecodedImageById(id) {
  const docRef = db().collection("decodedImages").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;
  const data = doc.data();
  await docRef.delete();
  return data; // return deleted doc data for cleanup (local file / storage deletion)
}