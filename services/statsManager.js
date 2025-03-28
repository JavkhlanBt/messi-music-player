const { UserStats, SongStats, ArtistStats } = require("../models/stats");

class StatsManager {
  async recordPlay(track, userId, username) {
    try {
      const song = await this._handleSongRecord(track);

      let artist = null;
      if (track.author) {
        artist = await this._handleArtistRecord(track, song._id);
      }

      await this._handleUserRecord(
        userId,
        username,
        song._id,
        artist?._id,
        track.author
      );

      return true;
    } catch (error) {
      console.error("Error recording play:", error);
      return false;
    }
  }

  async _handleSongRecord(track) {
    return await SongStats.findOneAndUpdate(
      { title: track.title, artist: track.author },
      {
        $setOnInsert: {
          title: track.title,
          artist: track.author,
          url: track.url,
          thumbnail: track.thumbnail,
          duration: track.duration,
          firstPlayed: new Date(),
        },
        $set: {
          lastPlayed: new Date(),
        },
        $inc: { playCount: 1 },
      },
      { upsert: true, new: true }
    );
  }

  async _handleArtistRecord(track, songId) {
    const artist = await ArtistStats.findOneAndUpdate(
      { name: track.author },
      {
        $setOnInsert: {
          name: track.author,
          firstPlayed: new Date(),
        },
        $set: {
          lastPlayed: new Date(),
        },
        $inc: { playCount: 1 },
        $addToSet: {
          topSongs: {
            songId: songId,
            playCount: 1,
          },
        },
      },
      { upsert: true, new: true }
    );

    await ArtistStats.updateOne(
      { _id: artist._id, "topSongs.songId": songId },
      { $inc: { "topSongs.$.playCount": 1 } }
    );

    return artist;
  }

  async _handleUserRecord(userId, username, songId, artistId, artistName) {
    const update = {
      $inc: { playCount: 1 },
      $set: {
        username,
        lastUpdated: new Date(),
      },
      $setOnInsert: {
        userId,
        username,
        topArtists: [],
        topSongs: [],
      },
    };

    const user = await UserStats.findOneAndUpdate({ userId }, update, {
      upsert: true,
      new: true,
    });

    const songIndex = user.topSongs.findIndex((s) => s.songId.equals(songId));
    if (songIndex >= 0) {
      user.topSongs[songIndex].playCount += 1;
    } else {
      user.topSongs.push({ songId, playCount: 1 });
    }

    if (artistId && artistName) {
      const artistIndex = user.topArtists.findIndex((a) =>
        a.artistId.equals(artistId)
      );
      if (artistIndex >= 0) {
        user.topArtists[artistIndex].playCount += 1;
      } else {
        user.topArtists.push({
          artistId,
          artistName,
          playCount: 1,
        });
      }
    }

    await user.save();
  }

  async getUserStats(userId) {
    try {
      return await UserStats.findOne({ userId })
        .populate("topSongs.songId")
        .populate("topArtists.artistId")
        .lean();
    } catch (error) {
      console.error("Error getting user stats:", error);
      return null;
    }
  }

  async getGlobalStats(limit = 5) {
    try {
      const totalPlaysResult = await UserStats.aggregate([
        { $group: { _id: null, total: { $sum: "$playCount" } } },
      ]);
      const totalPlays = totalPlaysResult[0]?.total || 0;

      const topSongs = await SongStats.find({ playCount: { $gt: 0 } })
        .sort({ playCount: -1 })
        .limit(limit)
        .lean();

      const topArtists = await ArtistStats.find({ playCount: { $gt: 0 } })
        .sort({ playCount: -1 })
        .limit(limit)
        .lean();

      const topUsers = await UserStats.find({ playCount: { $gt: 0 } })
        .sort({ playCount: -1 })
        .limit(limit)
        .lean();

      return {
        totalPlays,
        topSongs,
        topArtists,
        topUsers,
      };
    } catch (error) {
      console.error("Error getting global stats:", error);
      return {
        totalPlays: 0,
        topSongs: [],
        topArtists: [],
        topUsers: [],
      };
    }
  }

  async getTopSongs(limit = 10) {
    return SongStats.find().sort({ playCount: -1 }).limit(limit).lean();
  }

  async getTopArtists(limit = 10) {
    return ArtistStats.find().sort({ playCount: -1 }).limit(limit).lean();
  }

  async getTopUsers(limit = 10) {
    return UserStats.find().sort({ playCount: -1 }).limit(limit).lean();
  }
}

module.exports = new StatsManager();
