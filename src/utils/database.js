const mongoose = require("mongoose");
const { UserStats, SongStats, ArtistStats } = require("../models/stats");
const { Playlist } = require("../models/playlist");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("MongoDB connected successfully");

    const userCount = await UserStats.countDocuments();
    const songCount = await SongStats.countDocuments();
    console.log(`Database contains ${userCount} users and ${songCount} songs`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

function closeDB() {
  if (isConnected) {
    mongoose.connection.close();
    isConnected = false;
    console.log("MongoDB connection closed");
  }
}

module.exports = {
  connectDB,
  closeDB,
  UserStats,
  SongStats,
  ArtistStats,
  Playlist,
};
