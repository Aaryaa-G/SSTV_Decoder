// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded contains { id: <userId>, iat, exp }
    req.user = decoded; // { id: ... }
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
}
