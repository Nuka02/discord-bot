require("dotenv").config({ path: __dirname + "/.env" });
const { Client, GatewayIntentBits } = require("discord.js");
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const prefix = "?";
const token = process.env["TOKEN"];
const client = new Client({
  restTimeOffset: 0, // reaction speed fastest
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // Add other necessary intents for your bot
  ],
  // presence: {
    // status: "dnd",
    // activity: {
    //   name: "Custom music bot for Discord",
    //   type: "PLAYING",
    // },
  // },
});



const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin({ update: true })],
  searchSongs: false,
  emitNewSongOnly: false,
  highWaterMark: 1024 * 1024 * 64,
  leaveOnEmpty: true,
  leaveOnFinish: true,
  youtubeDL: false,
});

client.login(token);

client.on("ready", () => {
  console.log(`${client.user.tag} Bot is online!`);
});

client.on("message", (message) => {
  if (
    !message.content.startsWith(prefix) ||
    !message.guild ||
    message.author.bot
  )
    return;
  const args = message.content.slice(prefix.length).split(" ");
  const command = args.shift();

  if (command === "ping") return message.reply(`pong ${client.ws.ping}ms`);
  else if (command === "play" || command === "p") {
    message.reply("Searching..");
    distube.play(message, args.join(" "));
  } else if (command === "stop") {
    const queue = distube.getQueue(message);
    checkQueue(message, queue);
    distube.stop(message);
    message.reply("Music stopped");
  } else if (command === "skip") {
    const queue = distube.getQueue(message);
    checkQueue(message, queue);
    distube.skip(message);
    message.reply("Song skipped");
  } else if (command === "autoplay") {
    const mode = distube.toggleAutoplay(message);
    message.channel.send(`Set autoplay mode to ${mode ? "On" : "Off"}.`);
  } else if (command === "loop") {
    if (!(args[0] !== "on" || args[0] !== "off")) return;
    const mode =
      args[0] === "off"
        ? distube.setRepeatMode(message, 0)
        : distube.setRepeatMode(message, 1);
    message.channel.send(`Set repeat mode to ${mode === 0 ? "Off" : "On"}.`);
  } else if (command === "current") {
    const queue = distube.getQueue(message);
    checkQueue(message, queue);
    const song = queue.songs[0];
    message.channel.send(
      `Playing \`${song.name}\` - \`[${song.formattedDuration}](${
        song.url
      })\`\nRequested by: ${song.user}\n${stts(queue)}`
    );
  } else if (command === "queue") {
    const queue = distube.getQueue(message);
    checkQueue(message, queue);
    message.channel.send(
      "Current queue:\n" +
        queue.songs
          .map(
            (song, id) =>
              `**${id + 1}**. [${song.name}] - \`${song.formattedDuration}\``
          )
          .join("\n")
    );
  } else if (command === "jump") {
    const num = parseInt(args[0]) - 1;
    const queue = distube.getQueue(message);
    checkQueue(message, queue);
    if (num > queue.songs.length || num < 1) {
      message.reply("Invalid Song");
      return;
    }
    distube.jump(message, num);
    message.reply(`Jump to ${num + 1} in queue`);
  } else if (command === "help" || command === "h") {
    message.reply(
      `Current commands:\np|play {name|link} - Play the specified song  :arrow_forward:\nskip - Skip current song  :track_next:\nstop - Stop the music :stop_button:\ncurrent - Information about the song currently playing  :musical_note:\nqueue - Information about the queue  :notes:\njump {number} - Play song in specified queue position  :eject:\nautoplay - Toggle autoplay(default: on)  :repeat_one:\nloop {on|off} - Set loop to on|off(default: off)  :arrows_counterclockwise:\ninfo - Information about the bot  :information_source:`
    );
  } else if (command === "info") {
    message.reply(
      `Custom built music bot for Discord.\nType *?help* for more commands. If you want a certain command implemented, message @muke.\nCurrent version: v1.0.4`
    );
  } else {
    message.reply("Unknown command");
  }
});

const checkQueue = (message, queue) => {
  if (!queue) message.reply("No songs in queue");
  return;
};

// Queue status template
const stts = (queue) =>
  `Volume: \`${queue.volume}%\` | Filter: \`${
    queue.filter || "Off"
  }\` | Loop: \`${queue.repeatMode === 0 ? "Off" : "On"}\` | Autoplay: \`${
    queue.autoplay ? "On" : "Off"
  }\``;

// DisTube event listeners, more in the documentation page
distube
  //ONCE A SONG STARTS PLAYING SEND INFORMATIONAL MESSAGE
  .on("playSong", (message, queue, song) =>
    message.channel.send(
      `Playing \`${song.name}\` - \`[${song.formattedDuration}](${
        song.url
      })\`\nRequested by: ${song.user}\n${stts(queue)}`
    )
  )
  //ONCE A SONG IS ADDED TO THE QUEUE SEND INFORMATIONAL MESSAGE
  .on("addSong", (message, queue, song) =>
    message.channel.send(
      `Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`
    )
  )
  //ONCE A PLAYLIST STARTS PLAYING SEND INFORMATIONAL MESSAGE
  .on("playList", (message, queue, playlist, song) =>
    message.channel.send(
      `Play \`${playlist.name}\` playlist (${
        playlist.songs.length
      } songs).\nRequested by: ${song.user}\nNow playing \`${song.name}\` - \`${
        song.formattedDuration
      }\`\n${stts(queue)}`
    )
  )
  //ONCE A PLAYLIST IS ADDED TO THE QUEUE SEND INFORMATIONAL MESSAGE
  .on("addList", (message, queue, playlist) =>
    message.channel.send(
      `Added \`${playlist.name}\` playlist (${
        playlist.songs.length
      } songs) to queue\n${stts(queue)}`
    )
  )
  // DisTubeOptions.searchSongs = true
  .on("searchResult", (message, result) => {
    let i = 0;
    message.channel.send(
      `**Choose an option from below**\n${result
        .map(
          (song) => `**${++i}**. ${song.name} - \`${song.formattedDuration}\``
        )
        .join("\n")}\n*Enter anything else or wait 60 seconds to cancel*`
    );
  })
  // DisTubeOptions.searchSongs = true
  .on("searchCancel", (message) => message.channel.send(`Searching canceled`))
  .on("error", (message, e) => {
    console.error(e);
    message.channel.send("An error encountered: " + e);
  });
