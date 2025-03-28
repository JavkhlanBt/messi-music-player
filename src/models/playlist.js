const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    songs: [
      {
        title: { type: String, required: true },
        artist: { type: String, required: true },
        url: { type: String, required: true },
        duration: { type: String },
        thumbnail: { type: String },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Playlist = mongoose.model("Playlist", playlistSchema);

module.exports = { Playlist };
