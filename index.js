require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { Player } = require("discord-player");
const { YoutubeiExtractor } = require("discord-player-youtubei");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);

(async () => {
  await player.extractors.register(YoutubeiExtractor, {});
  console.log("Extractors registered");
})();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("!play music", { type: "LISTENING" });
});

player.events.on("playerStart", (queue, track) => {
  queue.metadata.channel.send(`🎶 Now playing: **${track.title}**`);
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

  if (!message.member.voice.channel) {
    return message.reply("❌ You must be in a voice channel first!");
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
      return message.reply("❌ Could not join your voice channel!");
    }

    switch (command) {
      case "тогло сда минь":
        if (!args[0])
          return message.reply("❌ Please provide a song name or URL!");

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
          try {
            await queue.node.play();
          } catch (err) {
            console.error("Play error:", err);
            message.reply("❌ Failed to play the track");
          }
        }
        break;

      case "скибиди":
        queue.node.skip();
        break;

      case "зогс лалраа":
        player.nodes.delete(message.guild.id);
        message.reply("🛑 Stopped the player");
        break;

      case "түр байж бай":
        queue.node.pause();
        message.reply("⏸ Player paused");
        break;

      case "үргэлжлүүлээд дуул":
        queue.node.resume();
        message.reply("▶ Player resumed");
        break;

      case "жагсаад":
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

      case "чанга":
        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 100) {
          return message.reply("❌ Please provide a volume between 1-100");
        }
        queue.node.setVolume(volume);
        message.reply(`🔊 Volume set to ${volume}%`);
        break;

      default:
        message.reply("❌ Unknown command! Try !play, !skip, !stop");
    }
  } catch (error) {
    console.error("Command error:", error);
    message.reply("❌ An error occurred while processing your command");
  }
});

client.login(process.env.TOKEN);
