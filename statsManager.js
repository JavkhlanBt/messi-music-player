const fs = require("fs");
const path = require("path");

class StatsManager {
  constructor() {
    this.statsPath = path.join(__dirname, "musicStats.json");
    this.stats = this.loadStats();
  }

  loadStats() {
    try {
      if (fs.existsSync(this.statsPath)) {
        return JSON.parse(fs.readFileSync(this.statsPath, "utf8"));
      }
      return {
        users: {},
        songs: {},
        artists: {},
        genres: {},
        totalPlays: 0,
      };
    } catch (error) {
      console.error("Error loading stats:", error);
      return {
        users: {},
        songs: {},
        artists: {},
        genres: {},
        totalPlays: 0,
      };
    }
  }

  saveStats() {
    try {
      fs.writeFileSync(this.statsPath, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.error("Error saving stats:", error);
    }
  }

  recordPlay(track, userId) {
    if (!track || !userId) return;

    // Update total plays
    this.stats.totalPlays = (this.stats.totalPlays || 0) + 1;

    // Update user stats
    if (!this.stats.users[userId]) {
      this.stats.users[userId] = {
        playCount: 0,
        topArtists: {},
        topSongs: {},
      };
    }
    this.stats.users[userId].playCount += 1;

    // Update song stats
    const songKey = `${track.title}|${track.author}`;
    if (!this.stats.songs[songKey]) {
      this.stats.songs[songKey] = {
        title: track.title,
        artist: track.author,
        playCount: 0,
        requestedBy: {},
      };
    }
    this.stats.songs[songKey].playCount += 1;
    this.stats.songs[songKey].requestedBy[userId] =
      (this.stats.songs[songKey].requestedBy[userId] || 0) + 1;

    // Update artist stats
    if (track.author) {
      if (!this.stats.artists[track.author]) {
        this.stats.artists[track.author] = {
          playCount: 0,
          topSongs: {},
        };
      }
      this.stats.artists[track.author].playCount += 1;

      // Update artist's top songs
      if (!this.stats.artists[track.author].topSongs[track.title]) {
        this.stats.artists[track.author].topSongs[track.title] = 0;
      }
      this.stats.artists[track.author].topSongs[track.title] += 1;
    }

    // Update user's top artists
    if (track.author) {
      if (!this.stats.users[userId].topArtists[track.author]) {
        this.stats.users[userId].topArtists[track.author] = 0;
      }
      this.stats.users[userId].topArtists[track.author] += 1;
    }

    // Update user's top songs
    if (!this.stats.users[userId].topSongs[songKey]) {
      this.stats.users[userId].topSongs[songKey] = 0;
    }
    this.stats.users[userId].topSongs[songKey] += 1;

    this.saveStats();
  }

  getUserStats(userId) {
    return this.stats.users[userId] || null;
  }

  getTopSongs(limit = 10) {
    return Object.entries(this.stats.songs)
      .sort((a, b) => b[1].playCount - a[1].playCount)
      .slice(0, limit)
      .map(([key, data]) => ({ ...data, key }));
  }

  getTopArtists(limit = 10) {
    return Object.entries(this.stats.artists)
      .sort((a, b) => b[1].playCount - a[1].playCount)
      .slice(0, limit)
      .map(([artist, data]) => ({ artist, ...data }));
  }

  getTopUsers(limit = 10) {
    return Object.entries(this.stats.users)
      .sort((a, b) => b[1].playCount - a[1].playCount)
      .slice(0, limit)
      .map(([userId, data]) => ({ userId, ...data }));
  }
}

module.exports = new StatsManager();
