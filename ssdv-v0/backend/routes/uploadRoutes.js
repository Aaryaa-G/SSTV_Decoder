// backend/routes/uploadRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import authMiddleware from "../middleware/authMiddleware.js";
import DecodedImage from "../models/DecodedImages.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
const decodedDir = path.join(uploadsDir, "decoded");

// ensure directories exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(decodedDir)) fs.mkdirSync(decodedDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const name = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\.-]/g, "");
    cb(null, `${Date.now()}-${name}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /wav|mp3|flac|ogg|m4a|aiff|aac/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

// ==================== UPLOAD & STREAM DECODER LOGS (SSE) ====================
router.post("/audio-stream", authMiddleware, upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "No file uploaded" });
  }

  const uploadedPath = req.file.path;
  const outFilename = `${Date.now()}-${path.parse(req.file.originalname).name}.png`;
  const outPath = path.join(decodedDir, outFilename);
  const decoderScript = path.join(__dirname, "..", "decoder", "test_decoder.py");
  const pythonCmd = process.env.PYTHON_PATH || "python";

  if (!fs.existsSync(decoderScript)) {
    return res.status(500).json({ msg: "Decoder script not found" });
  }

  // Set SSE headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Helper to send SSE messages
  const sendMessage = (msg) => {
    try {
      res.write(`data: ${msg}\n\n`);
    } catch (err) {
      console.error("Error writing to SSE stream:", err);
    }
  };

  console.log("Starting SSTV decode...");
  console.log("Input:", uploadedPath);
  console.log("Output filename:", outFilename);
  console.log("Script:", decoderScript);

  const child = spawn(pythonCmd, [decoderScript, uploadedPath], {
    cwd: path.join(__dirname, "..", "decoder"),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let decoderOutput = "";
  let decoderError = "";

  // Capture stdout
  child.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);
    lines.forEach((line) => {
      console.log("[DECODER]", line);
      sendMessage(line);
      decoderOutput += line + "\n";
    });
  });

  // Capture stderr
  child.stderr.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);
    lines.forEach((line) => {
      console.error("[DECODER ERROR]", line);
      sendMessage(`[ERROR] ${line}`);
      decoderError += line + "\n";
    });
  });

  child.on("error", (err) => {
    console.error("Decoder process error:", err);
    sendMessage(`[ERROR] Decoder process failed: ${err.message}`);
    res.end();
  });

  child.on("close", async (code) => {
    console.log("Decoder process closed with code:", code);

    if (code === 0) {
      try {
        // Get latest decoded image from decoder output by modification time (NOT alphabetically)
        const decoderOutputDir = path.join(__dirname, "..", "decoder", "decoded_output");

        if (!fs.existsSync(decoderOutputDir)) {
          sendMessage("[ERROR] Decoder output directory not found");
          res.end();
          return;
        }

        const files = fs.readdirSync(decoderOutputDir);
        if (files.length === 0) {
          sendMessage("[ERROR] No decoded image generated");
          res.end();
          return;
        }

        // Get the most recently modified file (by time, not alphabetically)
        let mostRecentFile = files[0];
        let mostRecentTime = fs.statSync(path.join(decoderOutputDir, files[0])).mtime;

        for (let i = 1; i < files.length; i++) {
          const filePath = path.join(decoderOutputDir, files[i]);
          const fileTime = fs.statSync(filePath).mtime;
          if (fileTime > mostRecentTime) {
            mostRecentTime = fileTime;
            mostRecentFile = files[i];
          }
        }

        const decodedImagePath = path.join(decoderOutputDir, mostRecentFile);
        console.log("Most recent decoded image:", mostRecentFile);

        // Copy to uploads/decoded with unique timestamp filename
        fs.copyFileSync(decodedImagePath, outPath);
        console.log("Image copied to:", outPath);

        // Extract SSTV mode from decoder output
        const decoderMode = extractModeFromOutput(decoderOutput);

        // Save to MongoDB
        try {
          const decodedImage = new DecodedImage({
            userId: req.user.id,
            originalFilename: req.file.originalname,
            decodedFilename: outFilename,
            imagePath: `/uploads/decoded/${outFilename}`,
            uploadedAt: new Date(),
            decoderMode: decoderMode,
          });
          await decodedImage.save();
          console.log("Saved to MongoDB");
        } catch (dbErr) {
          console.error("MongoDB save error:", dbErr);
          sendMessage(`[WARNING] Image decoded but DB save failed: ${dbErr.message}`);
        }

        // Send success message with image URL
        sendMessage("[SUCCESS] SSTV image decoded successfully");
        sendMessage(JSON.stringify({ imageUrl: `/uploads/decoded/${outFilename}` }));
      } catch (err) {
        console.error("Post-processing error:", err);
        sendMessage(`[ERROR] Post-processing failed: ${err.message}`);
      }
    } else {
      sendMessage(`[ERROR] Decoder exited with code ${code}`);
      if (decoderError) {
        sendMessage(`[ERROR] Details: ${decoderError}`);
      }
    }

    // End the stream
    res.end();
  });

  // Handle client disconnect
  req.on("close", () => {
    if (!child.killed) {
      console.log("Client disconnected, killing decoder process");
      child.kill();
    }
  });
});

// ==================== GET USER'S DECODED IMAGES ====================
router.get("/gallery", authMiddleware, async (req, res) => {
  try {
    const images = await DecodedImage.find({ userId: req.user.id })
      .sort({ uploadedAt: -1 })
      .limit(50);
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch gallery", error: err.message });
  }
});

// ==================== DELETE DECODED IMAGE ====================
router.delete("/image/:id", authMiddleware, async (req, res) => {
  try {
    const image = await DecodedImage.findById(req.params.id);
    if (!image) return res.status(404).json({ msg: "Image not found" });

    if (image.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const filePath = path.join(decodedDir, image.decodedFilename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await DecodedImage.findByIdAndDelete(req.params.id);
    res.json({ msg: "Image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Delete failed", error: err.message });
  }
});

// ==================== HELPER ====================
function extractModeFromOutput(output) {
  if (output.includes("Martin 1")) return "Martin 1";
  if (output.includes("Martin 2")) return "Martin 2";
  if (output.includes("Scottie 1")) return "Scottie 1";
  if (output.includes("Scottie 2")) return "Scottie 2";
  if (output.includes("Scottie DX")) return "Scottie DX";
  if (output.includes("Robot 36")) return "Robot 36";
  if (output.includes("Robot 72")) return "Robot 72";
  if (output.includes("PD 120")) return "PD 120";
  return "Unknown";
}

export default router;