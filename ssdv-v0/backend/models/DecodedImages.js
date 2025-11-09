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
  try {
    // Avoid composite-index requirement by not using orderBy in Firestore.
    // Fetch a reasonable batch and sort in-memory by uploadedAt descending.
    const snap = await db().collection("decodedImages").where("uploaderUid", "==", uid).limit(limit * 5).get();
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    results.sort((a, b) => {
      const ta = a.uploadedAt && a.uploadedAt.toDate ? a.uploadedAt.toDate().getTime() : a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt && b.uploadedAt.toDate ? b.uploadedAt.toDate().getTime() : b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return tb - ta;
    });

    return results.slice(0, limit);
  } catch (err) {
    console.error("getDecodedImagesByUid failed:", err);
    throw err;
  }
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