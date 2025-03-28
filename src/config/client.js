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
  try {
    await player.extractors.register(YoutubeiExtractor, {});
    console.log("YouTube extractor registered successfully");
  } catch (error) {
    console.error("Failed to register YouTube extractor:", error);
  }
})();

module.exports = { client, player };
