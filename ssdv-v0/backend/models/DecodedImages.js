// backend/models/DecodedImage.js
import mongoose from "mongoose";

const DecodedImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    decodedFilename: {
      type: String,
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    decoderMode: {
      type: String,
      enum: ["Martin 1", "Martin 2", "Scottie 1", "Scottie 2", "Scottie DX", "Robot 36", "Robot 72", "PD 120", "Unknown"],
      default: "Unknown",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    tags: [String],
  },
  { timestamps: true }
);

const DecodedImage = mongoose.model("DecodedImage", DecodedImageSchema);

export default DecodedImage;