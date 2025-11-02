// import express from "express";
// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import cors from "cors";
// import authRoutes from "./routes/authRoutes.js";
// import path from "path";
// import { fileURLToPath } from "url";
// import uploadRoutes from "./routes/uploadRoutes.js";
// // Load environment variables
// dotenv.config();

// // Init Express app
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// //Routes
// app.use("/api/auth", authRoutes);

// // Test route
// app.get("/", (req, res) => {
//   res.send("Backend API is running 🚀");
// });

// // compute __dirname in ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // serve uploads folder
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // add routes
// app.use("/api/upload", uploadRoutes);


// // MongoDB connection
// const PORT = process.env.PORT || 5000;
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("✅ MongoDB connected");
//     app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//   })
//   .catch((err) => console.log("❌ DB connection failed:", err));


// import express from "express";
// import dotenv from "dotenv";
// // ...existing code...
// // import mongoose from "mongoose";
// import cors from "cors";
// import authRoutes from "./routes/authRoutes.js";
// import path from "path";
// import { fileURLToPath } from "url";
// import uploadRoutes from "./routes/uploadRoutes.js";
// import admin from "firebase-admin";
// import fs from "fs";
// import path from "path";

// // ...existing code...

// dotenv.config();

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api/auth", authRoutes);

// app.get("/", (req, res) => {
//   res.send("Backend API is running 🚀");
// });

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/api/upload", uploadRoutes);

// const PORT = process.env.PORT || 5000;

// async function initFirebaseAndStart() {
//   try {
//     let serviceAccount;
//     let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

//     if (process.env.FIREBASE_SERVICE_ACCOUNT) {
//       // FIREBASE_SERVICE_ACCOUNT must be base64(serviceAccountJson)
//       const svcJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
//       serviceAccount = JSON.parse(svcJson);
//     } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
//       const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
//       serviceAccount = JSON.parse(raw);
//     }

//     // prefer project_id from service account if available
//     if (serviceAccount && serviceAccount.project_id) {
//       projectId = serviceAccount.project_id;
//     }

//     // ensure environment variables used by Google libraries are present
//     if (projectId) {
//       process.env.GCLOUD_PROJECT = projectId;
//       process.env.FIREBASE_PROJECT_ID = projectId;
//     }

//     // initialize admin only once
//     if (!admin.apps.length) {
//       if (serviceAccount) {
//         admin.initializeApp({
//           credential: admin.credential.cert(serviceAccount),
//           storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//         });
//       } else {
//         // fallback to application default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
//         admin.initializeApp({
//           credential: admin.credential.applicationDefault(),
//           storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//         });
//       }
//     }

//     // attach admin to app locals for routes to use
//     app.locals.firebaseAdmin = admin;

//     console.log("✅ Firebase Admin initialized", { projectId: process.env.FIREBASE_PROJECT_ID || null, bucket: process.env.FIREBASE_STORAGE_BUCKET || null });
//     app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//   } catch (err) {
//     console.error("❌ Firebase Admin init failed:", err);
//     process.exit(1);
//   }
// }

// initFirebaseAndStart();

// ...existing code...
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import uploadRoutes from "./routes/uploadRoutes.js";
import admin from "firebase-admin";
import fs from "fs";
// ...existing code...

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;

async function initFirebaseAndStart() {
  try {
    let serviceAccount = null;
    let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || null;

    // 1) base64 encoded JSON in env (preferred for CI)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const svcJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
        serviceAccount = JSON.parse(svcJson);
      } catch (e) {
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT: not valid base64 JSON");
      }
    }

    // 2) resolve service account path with several strategies
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const candidate = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim();

      const tryPaths = [
        candidate, // as-provided
        path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate), // relative to cwd
        path.isAbsolute(candidate) ? candidate : path.resolve(__dirname, candidate), // relative to this file
      ];

      const uniquePaths = [...new Set(tryPaths)];
      let found = null;
      for (const p of uniquePaths) {
        if (fs.existsSync(p)) {
          found = p;
          break;
        }
      }

      if (!found) {
        throw new Error(`Service account file not found. Tried:\n${uniquePaths.join("\n")}`);
      }

      const raw = fs.readFileSync(found, "utf8");
      try {
        serviceAccount = JSON.parse(raw);
      } catch (e) {
        throw new Error(`Service account file at ${found} is not valid JSON`);
      }
    }

    // 3) try GOOGLE_APPLICATION_CREDENTIALS
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const candidate = path.isAbsolute(adc) ? adc : path.resolve(process.cwd(), adc);
      if (fs.existsSync(candidate)) {
        try {
          const raw = fs.readFileSync(candidate, "utf8");
          serviceAccount = JSON.parse(raw);
        } catch (e) {
          // ignore parse error, will fallback to applicationDefault()
        }
      }
    }

    if (serviceAccount && serviceAccount.project_id) {
      projectId = serviceAccount.project_id;
    }

    if (!projectId) {
      throw new Error("Missing Firebase project id. Set FIREBASE_PROJECT_ID or provide service account JSON with project_id.");
    }

    // set envs expected by Google libraries
    process.env.GCLOUD_PROJECT = projectId;
    process.env.FIREBASE_PROJECT_ID = projectId;

    // initialize admin
    if (!admin.apps.length) {
      const initOptions = {
        projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
      };

      if (serviceAccount) initOptions.credential = admin.credential.cert(serviceAccount);
      else initOptions.credential = admin.credential.applicationDefault();

      admin.initializeApp(initOptions);
    }

    app.locals.firebaseAdmin = admin;

    console.log("✅ Firebase Admin initialized", { projectId, bucket: process.env.FIREBASE_STORAGE_BUCKET || null });
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Firebase Admin init failed:", err.message || err);
    process.exit(1);
  }
}

initFirebaseAndStart();
// ...existing code...