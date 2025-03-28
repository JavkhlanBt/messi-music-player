const songDatabase = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
  "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
];

function getRandomSong() {
  return songDatabase[Math.floor(Math.random() * songDatabase.length)];
}

module.exports = {
  songDatabase,
  getRandomSong,
};
