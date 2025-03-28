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

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Discord bot is online!");
});

app.post("/webhook", (req, res) => {
  console.log("Webhook received:", req.body);
  res.send("Webhook received!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const axios = require("axios");
const serviceUrl =
  process.env.SERVICE_URL || "https://my-discord-bot.onrender.com";

axios
  .get(`${serviceUrl}/webhook`)
  .then((response) => {
    console.log("Successfully connected to service:", response.data);
  })
  .catch((error) => {
    console.error("Error connecting to service:", error);
  });
