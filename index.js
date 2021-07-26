const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const Fliter = require("bad-words");
const favicon = require("serve-favicon");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  userJoin,
  userLeave,
  getCurrentUser,
  getUsersInRoom,
} = require("./utils/users");

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Set favicon
app.use(favicon(path.join(__dirname, "public/favicon.ico")));

const botName = "ChatBox";

// Run when client connects
io.on("connection", (socket) => {
  // console.log("a user connected");

  // Setting up username and room
  socket.on("joinRoom", ({ username, room }, callback) => {
    const { error, user } = userJoin({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }
    socket.join(user.room); // we pass the user.room (validate data e.g., trim, lowercase) instead of just room

    socket.emit("message", generateMessage(botName, "Welcome to the chat!"));

    //  send a message to everyone except for a certain emitting socket
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(botName, `${user.username} has joined the chat!`)
      );

    // Send users and room info when user joined
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback(); // call ack when theres no error
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg, callback) => {
    const user = getCurrentUser(socket.id);
    const filter = new Fliter();
    io.to(user.room).emit(
      "message",
      generateMessage(user.username, filter.clean(msg))
    );
    callback();
  });

  // Listen for location request
  socket.on("sendLocation", (coords, callback) => {
    // console.log(coords);
    const user = getCurrentUser(socket.id);

    // Send location back to clients
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://www.google.com/maps/?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(botName, `${user.username} has left!`)
      );

      // Send users and room info when user left
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
