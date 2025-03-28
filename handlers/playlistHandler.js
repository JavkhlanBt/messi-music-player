const { player } = require("../config/client");
const playlistManager = require("../services/playlistManager");

async function handlePlaylistAction(message, action, args) {
  try {
    const userId = message.author.id;

    switch (action) {
      case "create":
        if (!args[0]) {
          return message.reply("Please provide a playlist name");
        }
        const name = args.join(" ");
        const playlist = await playlistManager.createPlaylist(userId, name);
        return message.reply(`✅ Playlist "${playlist.name}" created!`);

      case "add":
        if (args.length < 2) {
          return message.reply(
            "Usage: !playlist add <playlistId> <songUrl or search query>"
          );
        }
        const playlistId = args.shift();
        const query = args.join(" ");

        const searchResult = await player.search(query, {
          requestedBy: message.author,
          searchEngine: "youtube",
        });

        if (!searchResult.hasTracks()) {
          return message.reply("❌ No results found!");
        }

        const track = searchResult.tracks[0];
        const updatedPlaylist = await playlistManager.addSongToPlaylist(
          playlistId,
          track
        );

        return message.reply(
          `✅ Added **${track.title}** to playlist "${updatedPlaylist.name}"`
        );

      case "list":
        const playlists = await playlistManager.getUserPlaylists(userId);
        if (playlists.length === 0) {
          return message.reply(
            "You don't have any playlists yet. Create one with !playlist create <name>"
          );
        }

        const embed = {
          title: "🎵 Your Playlists",
          description: playlists
            .map(
              (p) =>
                `**${p.name}** (${p.songs.length} songs)\n` +
                `ID: \`${p._id}\`\n` +
                `Created: ${p.createdAt.toLocaleDateString()}`
            )
            .join("\n\n"),
          color: 0x1db954,
        };
        return message.channel.send({ embeds: [embed] });

      case "play":
        if (!args[0]) {
          return message.reply("Please provide a playlist ID");
        }

        const shouldShuffle = args.includes("--shuffle");
        const playlistId1 = args[0];

        try {
          let playlist = await playlistManager.getPlaylist(playlistId1);

          if (!playlist || playlist.userId !== userId) {
            return message.reply("Playlist not found or no permission");
          }

          if (playlist.songs.length === 0) {
            return message.reply("This playlist is empty!");
          }

          if (shouldShuffle) {
            playlist = await playlistManager.shufflePlaylist(playlistId1);
          }

          const queue =
            player.nodes.get(message.guild.id) ||
            player.nodes.create(message.guild.id, {
              metadata: { channel: message.channel },
            });

          if (!queue.connection) {
            await queue.connect(message.member.voice.channel);
          }

          for (const song of playlist.songs) {
            const searchResult = await player.search(song.url, {
              requestedBy: message.author,
              searchEngine: "youtube",
            });

            if (searchResult.hasTracks()) {
              queue.addTrack(searchResult.tracks[0]);
            }
          }

          if (!queue.node.isPlaying()) {
            await queue.node.play();
          }

          return message.reply(
            `🎶 Added ${playlist.songs.length} ${
              shouldShuffle ? "shuffled " : ""
            }songs from "${playlist.name}" to the queue!`
          );
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      case "songs":
        if (!args[0]) {
          return message.reply("Please provide a playlist ID");
        }

        try {
          const songs = await playlistManager.getPlaylistSongs(args[0]);

          if (songs.length === 0) {
            return message.reply("This playlist is empty!");
          }

          const songsList = songs
            .slice(0, 10)
            .map(
              (song, index) =>
                `${index + 1}. ${song.title} - ${song.artist} (${
                  song.duration
                })`
            )
            .join("\n");

          const embed = {
            title: "🎵 Playlist Songs",
            description: songsList,
            color: 0x1db954,
            footer:
              songs.length > 10
                ? { text: `+ ${songs.length - 10} more songs...` }
                : null,
          };

          return message.channel.send({ embeds: [embed] });
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      case "remove":
        if (args.length < 2) {
          return message.reply(
            "Usage: !playlist remove <playlistId> <songNumber>"
          );
        }
        const removePlaylistId = args[0];
        const songNumber = parseInt(args[1]);

        if (isNaN(songNumber) || songNumber < 1) {
          return message.reply("Please provide a valid song number");
        }

        const updatedPlaylistAfterRemove =
          await playlistManager.removeSongFromPlaylist(
            removePlaylistId,
            songNumber - 1
          );

        if (!updatedPlaylistAfterRemove) {
          return message.reply(
            "Failed to remove song. Please check the playlist ID and song number."
          );
        }

        return message.reply(
          `✅ Removed song #${songNumber} from playlist "${updatedPlaylistAfterRemove.name}"`
        );

      case "shuffle":
        if (!args[0]) {
          return message.reply("Please provide a playlist ID to shuffle");
        }

        try {
          const shuffledPlaylist = await playlistManager.shufflePlaylist(
            args[0]
          );
          return message.reply(
            `🔀 Successfully shuffled playlist "${shuffledPlaylist.name}"`
          );
        } catch (error) {
          return message.reply(`❌ Error shuffling playlist: ${error.message}`);
        }

      case "delete":
        if (!args[0]) {
          return message.reply("Please provide a playlist ID to delete");
        }
        const deleted = await playlistManager.deletePlaylist(args[0]);
        if (!deleted) {
          return message.reply(
            "Failed to delete playlist. It may not exist or you don't have permission."
          );
        }
        return message.reply(`🗑️ Deleted playlist "${deleted.name}"`);

      default:
        return message.reply(
          "Unknown playlist action. Use: create, add, list, play, remove, delete"
        );
    }
  } catch (error) {
    console.error("Playlist action error:", error);
    return message.reply(
      "❌ An error occurred while processing your playlist request."
    );
  }
}

module.exports = { handlePlaylistAction };
