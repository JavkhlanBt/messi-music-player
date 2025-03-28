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

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord bot is running!");
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
