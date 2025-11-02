// // backend/middleware/authMiddleware.js
// import jwt from "jsonwebtoken";

// export default function authMiddleware(req, res, next) {
//   const authHeader = req.headers.authorization || req.headers.Authorization;
//   if (!authHeader?.startsWith("Bearer ")) {
//     return res.status(401).json({ msg: "No token, authorization denied" });
//   }

//   const token = authHeader.split(" ")[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     // decoded contains { id: <userId>, iat, exp }
//     req.user = decoded; // { id: ... }
//     next();
//   } catch (err) {
//     return res.status(401).json({ msg: "Invalid token" });
//   }
// }
import admin from "firebase-admin";

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // decoded contains uid and other Firebase claims
    req.user = { uid: decoded.uid, ...decoded };
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token", error: err.message });
  }
}