require("dotenv").config();
const { client } = require("./config/client");
const { connectDB } = require("./utils/database");
const { setupPlayerEvents } = require("./handlers/playerEvents");
const { handleMessage } = require("./handlers/messageHandler");

client.on("ready", async () => {
  await connectDB();
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("!play music", { type: "LISTENING" });
});

setupPlayerEvents(client.player);
client.on("messageCreate", handleMessage);

client.login(process.env.TOKEN);
