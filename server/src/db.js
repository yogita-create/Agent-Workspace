import mongoose from "mongoose";

export async function connectDB(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log("✅ MongoDB Atlas connected");
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error("❌ Max MongoDB connection attempts reached.");
      }
    }
  }
}