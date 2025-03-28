const { Playlist } = require("../models/playlist");
const mongoose = require("mongoose");

class PlaylistManager {
  async createPlaylist(userId, name, description = "") {
    try {
      const playlist = new Playlist({
        userId,
        name,
        description,
        songs: [],
      });
      await playlist.save();
      return playlist;
    } catch (error) {
      console.error("Error creating playlist:", error);
      return null;
    }
  }

  async addSongToPlaylist(playlistId, song) {
    try {
      if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new Error("Invalid playlist ID format");
      }

      const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
          $push: {
            songs: {
              title: song.title,
              artist: song.author,
              url: song.url,
              duration: song.duration,
              thumbnail: song.thumbnail,
            },
          },
          $set: { updatedAt: new Date() },
        },
        { new: true }
      );

      if (!playlist) {
        throw new Error("Playlist not found");
      }

      return playlist;
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      throw error;
    }
  }

  async getUserPlaylists(userId) {
    try {
      return await Playlist.find({ userId }).sort({ updatedAt: -1 });
    } catch (error) {
      console.error("Error getting user playlists:", error);
      return [];
    }
  }

  async getPlaylist(playlistId) {
    try {
      return await Playlist.findById(playlistId);
    } catch (error) {
      console.error("Error getting playlist:", error);
      return null;
    }
  }

  async getPlaylistSongs(playlistId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new Error("Invalid playlist ID format");
      }

      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        throw new Error("Playlist not found");
      }

      return playlist.songs;
    } catch (error) {
      console.error("Error getting playlist songs:", error);
      throw error;
    }
  }

  async shufflePlaylist(playlistId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new Error("Invalid playlist ID format");
      }

      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        throw new Error("Playlist not found");
      }

      for (let i = playlist.songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist.songs[i], playlist.songs[j]] = [
          playlist.songs[j],
          playlist.songs[i],
        ];
      }

      playlist.updatedAt = new Date();
      await playlist.save();

      return playlist;
    } catch (error) {
      console.error("Error shuffling playlist:", error);
      throw error;
    }
  }

  async removeSongFromPlaylist(playlistId, songIndex) {
    try {
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) return null;

      playlist.songs.splice(songIndex, 1);
      playlist.updatedAt = new Date();
      await playlist.save();
      return playlist;
    } catch (error) {
      console.error("Error removing song from playlist:", error);
      return null;
    }
  }

  async deletePlaylist(playlistId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new Error("Invalid playlist ID format");
      }

      const deleted = await Playlist.findByIdAndDelete(playlistId);
      if (!deleted) {
        throw new Error("Playlist not found");
      }
      return deleted;
    } catch (error) {
      console.error("Error deleting playlist:", error);
      throw error;
    }
  }
}

module.exports = new PlaylistManager();
