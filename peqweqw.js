require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const { YoutubeiExtractor } = require("discord-player-youtubei");
const { getYoutubeVideo } = require("play-dl");
const { stream } = require("play-dl");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);
const triviaSessions = new Map();
const SNIPPET_DURATION = 15;

(async () => {
  await player.extractors.register(YoutubeiExtractor, {});
  console.log("Extractors registered");
})();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("!play music", { type: "LISTENING" });
});

player.events.on("playerStart", (queue, track) => {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("🎶 Now Playing")
    .addFields(
      { name: "Title", value: track.title, inline: true },
      { name: "Artist", value: track.author || "Unknown", inline: true },
      { name: "Duration", value: track.duration, inline: true },
      {
        name: "Album",
        value:
          track.source === "youtube" ? "YouTube" : track.album || "Unknown",
        inline: true,
      },
      {
        name: "Requested by",
        value: track.requestedBy?.toString() || "Autoplay",
        inline: true,
      },
      {
        name: "URL",
        value: track.url ? `[Click Here](${track.url})` : "Not available",
        inline: true,
      }
    )
    .setThumbnail(track.thumbnail || "https://i.imgur.com/AfFp7pu.png")
    .setTimestamp();

  queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on("playerSkip", (queue, track) => {
  queue.metadata.channel.send(`⏭ Skipped: **${track.title}**`);
});

player.events.on("playerFinish", (queue) => {
  queue.metadata.channel.send("✅ Queue finished!");
});

player.events.on("error", (queue, error) => {
  console.error(`Player error: ${error.message}`);
  queue.metadata.channel.send("❌ Player error occurred");
});

player.events.on("playerError", (queue, error) => {
  console.error(`Player error: ${error.message}`);
  queue.metadata.channel.send("❌ Error playing track");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice("!".length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Music Bot Commands")
      .setDescription(
        `
**Music Commands:**
!play <song/url> - Play a song or add to queue
!skip - Skip current song
!stop - Stop the player
!pause - Pause current song
!resume - Resume paused song
!queue - Show current queue
!volume <1-100> - Set volume
!loop <off/track/queue> - Set loop mode

**Game Command:**
!guesssong - Start a "Guess the Song" game

**Info Command:**
!help - Show this help
      `
      )
      .setFooter({
        text: "You need to be in a voice channel to use music commands",
      });

    return message.reply({ embeds: [embed] });
  }

  if (command === "guesssong") {
    if (triviaSessions.has(message.guild.id)) {
      return message.reply("A trivia game is already running in this server!");
    }

    if (!message.member.voice.channel) {
      return message.reply("You need to join a voice channel first!");
    }

    try {
      // Get a random track
      let triviaTrack;
      const searches = ["popular songs", "top hits", "billboard top 100"];
      const randomSearch =
        searches[Math.floor(Math.random() * searches.length)];
      const searchResult = await player.search(randomSearch, {
        requestedBy: message.author,
      });

      if (!searchResult.hasTracks()) {
        return message.reply("Couldn't find any songs to play!");
      }

      triviaTrack =
        searchResult.tracks[
          Math.floor(Math.random() * searchResult.tracks.length)
        ];

      // Store the correct answer
      triviaSessions.set(message.guild.id, {
        answer: triviaTrack.title.toLowerCase(),
        artist: triviaTrack.author.toLowerCase(),
        channel: message.channel,
        timeout: setTimeout(() => {
          message.channel.send(
            `⏰ Time's up! The song was **${triviaTrack.title}** by **${triviaTrack.author}**`
          );
          triviaSessions.delete(message.guild.id);
        }, 30000),
      });

      const snippetQueue = player.nodes.create(message.guild, {
        metadata: { channel: message.channel },
        selfDeaf: false,
        volume: 50,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 1000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 1000,
      });

      await snippetQueue.connect(message.member.voice.channel);
      await snippetQueue.play(triviaTrack.url);

      setTimeout(() => {
        if (snippetQueue.node.isPlaying()) {
          snippetQueue.node.stop();
        }
      }, SNIPPET_DURATION * 1000);

      const gameEmbed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle("🎵 Guess the Song!")
        .setDescription(
          `A ${SNIPPET_DURATION}-second snippet is playing! What's the song name or artist?\n\nType your answer in chat!`
        )
        .setFooter({ text: "You have 30 seconds to guess" });

      message.channel.send({ embeds: [gameEmbed] });
    } catch (error) {
      console.error("Trivia error:", error);
      triviaSessions.delete(message.guild.id);
      message.reply("Failed to start the trivia game. Please try again!");
    }
    return;
  }

  const triviaSession = triviaSessions.get(message.guild.id);
  if (triviaSession) {
    const userGuess = message.content.toLowerCase();
    const { answer, artist, channel, timeout } = triviaSession;

    if (userGuess.includes(answer) || userGuess.includes(artist)) {
      clearTimeout(timeout);
      channel.send(
        `🎉 **${message.author}** got it! The song was **${answer}** by **${artist}**`
      );
      triviaSessions.delete(message.guild.id);
    }
    return;
  }

  if (!message.member.voice.channel) {
    return message.reply("❌ Please join a voice channel first!");
  }

  try {
    const queue = player.nodes.create(message.guild, {
      metadata: {
        channel: message.channel,
      },
      selfDeaf: true,
      volume: 50,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 30000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 30000,
    });

    try {
      if (!queue.connection) {
        await queue.connect(message.member.voice.channel);
      }
    } catch (err) {
      console.error(err);
      player.nodes.delete(message.guild.id);
      return message.reply("❌ Failed to join voice channel!");
    }

    switch (command) {
      case "play":
        if (!args[0]) return message.reply("❌ Тодорхой юм оруул лалраа!");

        let searchResult;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            searchResult = await player.search(args.join(" "), {
              requestedBy: message.author,
            });
            if (searchResult.hasTracks()) break;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!searchResult.hasTracks()) {
          return message.reply("❌ ОЛДОХГҮЙ БАЙНА!!!!!!!!!!!!!!!");
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
          try {
            await queue.node.play();
          } catch (err) {
            console.error("Play error:", err);
            message.reply("❌ Failed to play the track");
          }
        }
        break;

      case "skip":
        queue.node.skip();
        break;

      case "stop":
        player.nodes.delete(message.guild.id);
        message.reply("🛑 Болилоо");
        break;

      case "pause":
        queue.node.pause();
        message.reply("⏸ Түр зогслоо");
        break;

      case "resume":
        queue.node.resume();
        message.reply("▶ Үргэлжлэлээ");
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

      default:
        message.reply("❌ Unknown command! Try !help for available commands");
    }
  } catch (error) {
    console.error("Command error:", error);
    message.reply("❌ An error occurred while processing your command");
  }
});

client.login(process.env.TOKEN);
