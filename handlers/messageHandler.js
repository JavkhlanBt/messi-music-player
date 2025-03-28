const { player } = require("../config/client");
const { getRandomSong } = require("../data/song");
const { handlePlaylistAction } = require("./playlistHandler");

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;

  if (message.content.toLowerCase() === "messi") {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.reply("❌ You need to join a voice channel first!");
      }

      const queue =
        player.nodes.get(message.guild.id) ||
        player.nodes.create(message.guild.id, {
          metadata: { channel: message.channel },
        });

      if (!queue.connection) {
        await queue.connect(voiceChannel);
      }

      const songUrl = "https://www.youtube.com/watch?v=1r4ArWJugvY";
      const searchResult = await player.search(songUrl, {
        requestedBy: message.author,
        searchEngine: "youtube",
      });

      if (!searchResult.hasTracks()) {
        return message.reply("❌ Could not load the song!");
      }

      queue.addTrack(searchResult.tracks[0]);
      message.reply(`🎵 **Now playing:** ${searchResult.tracks[0].title}`);

      if (!queue.node.isPlaying()) {
        await queue.node.play();
      }
    } catch (error) {
      console.error("Error playing song:", error);
      message.reply("❌ Failed to play the song!");
    }
    return;
  }

  if (!message.content.startsWith("!")) return;

  const args = message.content.slice("!".length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "help") {
    const helpMessage = `
**Music Bot Commands:**

!play <song/url> - Play a song or add it to the queue
!skip - Skip the current song
!stop - Stop the player and clear the queue
!pause - Pause the current song
!resume - Resume the paused song
!queue - Show the current queue
!volume <1-100> - Set the volume (1-100)
!loop <off/track/queue> - Set loop mode
!guesssong - Start a song guessing game
!stats [@user] - Show music statistics (global or for a user)

**Playlist Commands:**
!playlist create <name> - Create a new playlist
!playlist add <id> <song> - Add song to playlist
!playlist list - List your playlists
!playlist play <id> - Play a playlist
!playlist remove <id> <song#> - Remove song from playlist
!playlist delete <id> - Delete a playlist

!help - Show this help message
    `;
    return message.reply(helpMessage);
  }

  if (!message.member.voice.channel) {
    return message.reply("❌ Please join a voice channel first!");
  }

  try {
    const queue = player.nodes.create(message.guild, {
      metadata: { channel: message.channel },
      selfDeaf: true,
      volume: 50,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 30000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 30000,
    });

    if (!queue.connection) {
      await queue.connect(message.member.voice.channel);
    }

    switch (command) {
      case "play":
        if (!args[0])
          return message.reply("❌ Please provide a song name or URL!");

        const searchResult = await player.search(args.join(" "), {
          requestedBy: message.author,
          searchEngine: "youtube",
        });

        if (!searchResult || !searchResult.hasTracks()) {
          return message.reply("❌ No results found!");
        }

        if (searchResult.playlist) {
          queue.addTrack(searchResult.tracks);
          message.reply(
            `✅ Added playlist **${searchResult.playlist.title}** (${searchResult.tracks.length} tracks)`
          );
        } else {
          queue.addTrack(searchResult.tracks[0]);
          message.reply(
            `✅ Added **${searchResult.tracks[0].title}** to queue`
          );
        }

        if (!queue.node.isPlaying()) {
          await queue.node.play();
        }
        break;
      case "skip":
        queue.node.skip();
        break;
      case "playlist":
        if (!args[0]) {
          return message.reply(
            "Please specify a playlist action: create, add, list, play, remove, delete"
          );
        }
        const action = args.shift().toLowerCase();

        if (["add", "play", "remove", "delete", "info"].includes(action)) {
          if (!args[0]) {
            return message.reply(
              `Please provide a playlist ID for ${action} action`
            );
          }
          const playlistId = args.shift();
          return handlePlaylistAction(message, action, [playlistId, ...args]);
        }

        return handlePlaylistAction(message, action, args);
        break;
      case "stats":
        if (!args[0]) {
          const stats = await statsManager.getGlobalStats(5);

          if (!stats) {
            return message.reply("❌ Could not load statistics.");
          }

          const embed = {
            color: 0x0099ff,
            title: "📊 Music Statistics",
            description: `Total songs played: **${stats.totalPlays}**`,
            fields: [
              {
                name: "Top Songs",
                value:
                  stats.topSongs.length > 0
                    ? stats.topSongs
                        .map(
                          (s, i) =>
                            `${i + 1}. **${s.title}** - ${s.artist} (${
                              s.playCount
                            } plays)`
                        )
                        .join("\n")
                    : "No songs played yet",
                inline: true,
              },
              {
                name: "Top Artists",
                value:
                  stats.topArtists.length > 0
                    ? stats.topArtists
                        .map(
                          (a, i) =>
                            `${i + 1}. **${a.name}** (${a.playCount} plays)`
                        )
                        .join("\n")
                    : "No artist data yet",
                inline: true,
              },
              {
                name: "Top Listeners",
                value:
                  stats.topUsers.length > 0
                    ? stats.topUsers
                        .map(
                          (u, i) =>
                            `${i + 1}. **${u.username || "Unknown"}** (${
                              u.playCount
                            } plays)`
                        )
                        .join("\n")
                    : "No listener data yet",
                inline: false,
              },
            ],
            timestamp: new Date(),
          };
          return message.channel.send({ embeds: [embed] });
        } else {
          let targetUser = message.mentions.users.first() || message.author;
          const userStats = await statsManager.getUserStats(targetUser.id);

          if (!userStats) {
            return message.reply(
              `No stats available for ${targetUser.username}.`
            );
          }

          const embed = {
            color: 0x0099ff,
            title: `📊 Music Stats for ${targetUser.username}`,
            fields: [
              {
                name: "Total Plays",
                value: userStats.playCount.toString(),
                inline: true,
              },
              {
                name: "Top Artists",
                value:
                  userStats.topArtists
                    .sort((a, b) => b.playCount - a.playCount)
                    .slice(0, 3)
                    .map((a) => `**${a.artistName}** (${a.playCount} plays)`)
                    .join("\n") || "No data",
                inline: true,
              },
              {
                name: "Top Songs",
                value:
                  userStats.topSongs
                    .sort((a, b) => b.playCount - a.playCount)
                    .slice(0, 3)
                    .map(
                      (s) =>
                        `**${s.songId.title}** - ${s.songId.artist} (${s.playCount} plays)`
                    )
                    .join("\n") || "No data",
                inline: true,
              },
            ],
            thumbnail: {
              url: targetUser.displayAvatarURL(),
            },
            timestamp: new Date(),
          };

          return message.channel.send({ embeds: [embed] });
        }
        break;
      case "stop":
        player.nodes.delete(message.guild.id);
        message.reply("🛑 Stopped");
        break;

      case "pause":
        queue.node.pause();
        message.reply("⏸ Paused");
        break;

      case "resume":
        queue.node.resume();
        message.reply("▶ Resumed");
        break;

      case "queue":
        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray();
        let queueList = tracks
          .slice(0, 10)
          .map((track, i) => `${i + 1}. ${track.title} (${track.duration})`)
          .join("\n");
        message.reply(`
        **Now Playing**: ${currentTrack ? currentTrack.title : "Nothing"}
        **Up Next**:\n${queueList || "Empty queue"}
        ${tracks.length > 10 ? `\n+ ${tracks.length - 10} more tracks` : ""}
                `);
        break;

      case "volume":
        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 100) {
          return message.reply("❌ Please provide a volume between 1-100");
        }
        queue.node.setVolume(volume);
        message.reply(`🔊 Volume set to ${volume}%`);
        break;

      case "loop":
        if (!args[0]) {
          return message.reply(
            `🔁 Current loop mode: ${
              queue.repeatMode
                ? queue.repeatMode === 2
                  ? "queue"
                  : "track"
                : "off"
            }`
          );
        }
        const loopMode = args[0].toLowerCase();
        if (loopMode === "off") {
          queue.setRepeatMode(0);
          message.reply("🔁 Loop disabled");
        } else if (loopMode === "track") {
          queue.setRepeatMode(1);
          message.reply("🔂 Looping current track");
        } else if (loopMode === "queue") {
          queue.setRepeatMode(2);
          message.reply("🔁 Looping entire queue");
        } else {
          message.reply("❌ Invalid loop mode. Use: off, track, or queue");
        }
        break;
      case "topsongs":
        const topSongs = await statsManager.getTopSongs(10);
        message.reply({
          embeds: [
            {
              title: "🎵 Top 10 Songs",
              description: topSongs
                .map(
                  (s, i) =>
                    `${i + 1}. **${s.title}** - ${s.artist} (${
                      s.playCount
                    } plays)`
                )
                .join("\n"),
              color: 0x1db954,
            },
          ],
        });
        break;

      case "topartists":
        const topArtists = await statsManager.getTopArtists(10);
        message.reply({
          embeds: [
            {
              title: "🎤 Top 10 Artists",
              description: topArtists
                .map((a, i) => `${i + 1}. **${a.name}** (${a.playCount} plays)`)
                .join("\n"),
              color: 0x1db954,
            },
          ],
        });
        break;

      case "info":
        if (!args[0]) {
          return message.reply("Please provide a playlist ID");
        }
        const infoPlaylist = await playlistManager.getPlaylist(args[0]);
        if (!infoPlaylist || infoPlaylist.userId !== userId) {
          return message.reply(
            "Playlist not found or you don't have permission to access it"
          );
        }

        const songsList = infoPlaylist.songs
          .slice(0, 10)
          .map((s, i) => `${i + 1}. ${s.title} - ${s.artist} (${s.duration})`)
          .join("\n");

        const embed = {
          title: `🎵 Playlist: ${infoPlaylist.name}`,
          description: infoPlaylist.description || "No description",
          fields: [
            { name: "Songs", value: songsList || "No songs", inline: false },
            {
              name: "Stats",
              value: `Total songs: ${
                infoPlaylist.songs.length
              }\nCreated: ${infoPlaylist.createdAt.toLocaleDateString()}`,
              inline: true,
            },
          ],
          color: 0x1db954,
        };

        if (infoPlaylist.songs.length > 10) {
          embed.fields.push({
            name: "\u200b",
            value: `+ ${infoPlaylist.songs.length - 10} more songs...`,
            inline: false,
          });
        }

        return message.channel.send({ embeds: [embed] });
      case "guesssong":
        if (
          queue.node.isPlaying() &&
          queue.currentTrack?.metadata?.isGuessSong
        ) {
          return message.reply("❌ A guess song game is already in progress!");
        }

        const randomSong = getRandomSong();
        console.log("Guess song selected:", randomSong);

        try {
          const searchResult = await player.search(randomSong, {
            requestedBy: message.author,
            searchEngine: "youtube",
          });

          if (!searchResult || !searchResult.hasTracks()) {
            console.error(`No tracks found for URL: ${randomSong}`);
            return message.reply("❌ Failed to load song for guessing game!");
          }

          const track = searchResult.tracks[0];
          console.log("Track loaded:", track.title, track.url);

          queue.tracks.clear();

          queue.addTrack({
            ...track,
            metadata: {
              ...track.metadata,
              isGuessSong: true,
              startTime: Date.now(),
            },
          });

          try {
            await queue.node.play({
              nodeOptions: {
                filters: {
                  seek: 30,
                },
              },
            });
            console.log("Playback started successfully");
          } catch (playError) {
            console.error("Playback error:", playError);
            throw new Error("Could not play the track");
          }

          queue.node.setVolume(30);

          message.channel.send(
            "🎵 Guess the song! You have 20 seconds to type `!guess <Title - Artist>`"
          );

          setTimeout(async () => {
            if (queue.currentTrack?.metadata?.isGuessSong) {
              queue.node.stop();
              message.channel.send(
                `⏰ Time's up! The song was: **${track.title} - ${track.author}**`
              );
            }
          }, 20000);

          const guessCollector = message.channel.createMessageCollector({
            filter: (msg) =>
              !msg.author.bot && msg.content.startsWith("!guess"),
            time: 20000,
          });

          guessCollector.on("collect", (msg) => {
            const guessArgs = msg.content
              .slice("!guess".length)
              .trim()
              .toLowerCase();
            const correctAnswer =
              `${track.title} - ${track.author}`.toLowerCase();

            if (
              guessArgs.includes(track.title.toLowerCase()) ||
              guessArgs === correctAnswer
            ) {
              queue.node.stop();
              msg.reply(
                `🎉 Correct! The song was **${track.title} - ${track.author}**`
              );
              guessCollector.stop();
            } else {
              msg.reply("❌ Wrong guess! Try again.");
            }
          });
        } catch (error) {
          console.error("Guess song error:", error);
          message.reply(`❌ Failed to start guess song game: ${error.message}`);
        }
        break;
      default:
        message.reply("❌ Unknown command! Try !help for available commands");
    }
  } catch (error) {
    console.error("Command error:", error);
    message.reply(`❌ Error: ${error.message}`);
  }
}

module.exports = { handleMessage };
