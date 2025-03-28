const statsManager = require("../services/statsManager");

function setupPlayerEvents(player) {
  player?.events.on("playerStart", async (queue, track) => {
    console.log("Player started:", track.title, track.url);
    if (track.metadata?.isGuessSong) return;

    if (track.requestedBy) {
      try {
        const result = await statsManager.recordPlay(
          track,
          track.requestedBy.id,
          track.requestedBy.username
        );
        console.log("Record play result:", result);
      } catch (error) {
        console.error("Error recording play:", error);
      }
    }

    const embed = {
      color: 0x0099ff,
      title: "🎶 Now Playing",
      fields: [
        { name: "Title", value: track.title || "Unknown", inline: true },
        { name: "Artist", value: track.author || "Unknown", inline: true },
        { name: "Duration", value: track.duration || "Unknown", inline: true },
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
        },
      ],
      thumbnail: { url: track.thumbnail || "https://i.imgur.com/AfFp7pu.png" },
      timestamp: new Date(),
    };

    queue.metadata.channel.send({ embeds: [embed] });
  });

  player?.events.on("playerSkip", (queue, track) => {
    queue.metadata.channel.send(`⏭ Skipped: **${track.title}**`);
  });

  player?.events.on("playerFinish", (queue) => {
    if (queue.currentTrack?.metadata?.isGuessSong) {
      queue.tracks.clear();
      return;
    }
    queue.metadata.channel.send("✅ Finished!");
  });
  player?.events.on("error", (queue, error) => {
    console.error("General player error:", error.message, error.stack);
    queue.metadata.channel.send(`❌ Playback error: ${error.message}`);
  });

  player?.events.on("playerError", (queue, error) => {
    console.error("Detailed player error:", error.message, error.stack);
    queue.metadata.channel.send(`❌ Player error: ${error.message}`);
  });
}

module.exports = { setupPlayerEvents };
