const socket = io();

// Elements
const chatForm = document.querySelector("#chat-form");
const chatMessage = document.querySelector(".chat-messages");
const chatButton = document.querySelector("#chat-button");
const roomName = document.querySelector("#room-name");
const userList = document.querySelector("#users");
const sendLocationButton = document.querySelector("#send-location");

// Get username and room from URL
// console.log(location);
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // New/Last message element
  const newMessage = chatMessage.lastElementChild;

  // Height of the new/last message
  const newMessageStyles = getComputedStyle(newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom); // get the margin (int)
  const newMessageHeight = newMessage.offsetHeight + newMessageMargin; // newMessage.offsetHeight doesn't take into accout the margin, so we need to get the margin separately

  // Visible height, the amount of space I can view on the screen
  const visibleHeight = chatMessage.offsetHeight;

  // Height of messages container
  const containerHeight = chatMessage.scrollHeight;

  // How far have I scrolled?,
  // scrollTop give us the amount of distance we have scrolled from the top
  // We then add the visibleHeight we calculate previously, and this will give us how close to the bottom we are.
  const scrollOffset = chatMessage.scrollTop + visibleHeight;
  // console.log(chatMessage.scrollTop, visibleHeight);
  // console.log(scrollOffset);

  if (
    Math.round(containerHeight - newMessageHeight - 1) <=
    Math.round(scrollOffset)
  ) {
    chatMessage.scrollTop = chatMessage.scrollHeight;
  }
};

// Send user and room info to the server
socket.emit("joinRoom", { username, room }, (error) => {
  if (error) {
    return Swal.fire({
      title: "Error!",
      text: error,
      icon: "error",
      confirmButtonText: "Go Back",
      heightAuto: false,
    }).then(function () {
      location.href = "/";
    });
  }
});

// Get room and users
socket.on("roomData", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on("message", (message) => {
  // console.log(message);
  outputMessage(message);

  autoscroll();
});

// Message submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // disable when sending message to server
  chatButton.setAttribute("disabled", "disabled");
  // Get message text
  const msg = e.target.elements.msg.value;

  // Emit message to server
  socket.emit("chatMessage", msg, () => {
    // enable when server finished
    chatButton.removeAttribute("disabled");
    // Clear input
    e.target.elements.msg.value = "";
    e.target.elements.msg.focus();
  });
});

document.querySelector("#leave").addEventListener("click", () => {
  return Swal.fire({
    title: "Are you sure?",
    text: "If you leave this group, you'll no longer be able to see its member list or chat history.",
    icon: "warning",
    confirmButtonText: "Confirm",
    confirmButtonColor: "#198754",
    showCancelButton: true,
    cancelButtonText: "CANCEL",
    heightAuto: false,
  }).then((result) => {
    if (result.isConfirmed) {
      return (location.href = "/");
    }
  });
});

// Location submit
sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return Swal.fire({
      title: "Error!",
      text: "Geolocation is not supported by your browser",
      icon: "error",
      confirmButtonText: "OK",
    });
  }

  // disable when fetching location
  sendLocationButton.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    // console.log(position);
    const my_location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    socket.emit("sendLocation", my_location, () => {
      // enable when server finished
      sendLocationButton.removeAttribute("disabled");
    });
  });
});

// Get location
socket.on("locationMessage", (info) => {
  outputLocation(info);
  autoscroll();
});

// output message to DOM
function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<p class="meta">${message.username} <span>${message.time}</span></p>
  <p class="text">${message.text}</p>`;

  document.querySelector(".chat-messages").appendChild(div);
}

// output location to DOM
function outputLocation(info) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<p class="meta">${info.username} <span>${info.time}</span></p>
  <p><a href='${info.url}' target="_blank">My current location</a></p>`;

  document.querySelector(".chat-messages").appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = `${users
    .map((user) => `<li>${user.username}</li>`)
    .join("")}`;
}
