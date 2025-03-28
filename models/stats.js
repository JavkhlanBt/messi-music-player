const mongoose = require("mongoose");

const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: String,
    playCount: { type: Number, default: 0 },
    topArtists: [
      {
        artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
        artistName: String,
        playCount: { type: Number, default: 1 },
      },
    ],
    topSongs: [
      {
        songId: { type: mongoose.Schema.Types.ObjectId, ref: "Song" },
        playCount: { type: Number, default: 1 },
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const songStatsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    url: String,
    thumbnail: String,
    duration: String,
    playCount: { type: Number, default: 0 },
    lastPlayed: Date,
    firstPlayed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const artistStatsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    playCount: { type: Number, default: 0 },
    topSongs: [
      {
        songId: { type: mongoose.Schema.Types.ObjectId, ref: "Song" },
        playCount: { type: Number, default: 1 },
      },
    ],
    lastPlayed: Date,
    firstPlayed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const UserStats = mongoose.model("UserStats", userStatsSchema);
const SongStats = mongoose.model("SongStats", songStatsSchema);
const ArtistStats = mongoose.model("ArtistStats", artistStatsSchema);

module.exports = { UserStats, SongStats, ArtistStats };
