const http = require("http");
const socketIO = require("socket.io");
const axios = require("axios");
const cors = require("cors");
const express = require("express");
const app = express();

var thingDescriptions = {};
var roomDescriptions = {};
var peopleDescriptions = {};
var rooms = [];

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", methods: ["GET", "POST"] }));

const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("event", (data) => {
    // console.log("Type: " + data.eventType + "\nData: " + data.data);
    // console.log("Data:", JSON.stringify(data.data));
    var payload = {
      eventType: data.eventType,
      data: data.data,
    };
    // Emit the event to all sockets except the one that sent it
    socket.broadcast.emit("event", payload);
  });

  socket.on("reset", (data) => {
    var payload = {
      eventType: "reset",
      data: "reset",
    };
    thingDescriptions = {};
    roomDescriptions = {};
    peopleDescriptions = {};
    rooms = [];
    // Emit the event to all sockets except the one that sent it
    socket.broadcast.emit("reset", payload);
  });
});

const movePerson = (personId, roomName) => {
  if (io && personId && roomName) {
    io.emit("event", {
      eventType: "personMoved",
      data: {
        person: personId,
        room: roomName.replaceAll("_", " "),
      },
    });
  }
};

const determineLocation = (personId) => {
  const personRoom = rooms.find((room) => room.people && room.people[personId]);
  return personRoom ? personRoom.name : "Hallway";
};
const determineActions = (personId) => {
  const personRoom = rooms.find((room) => room.people && room.people[personId]);
  const actions = [];

  if (personRoom) {
    // Person is in a room
    Object.keys(personRoom.appliances).forEach((appliance) => {
      actions.push({
        method: "POST",
        appliance: appliance,
        url: `http://localhost:8080/api/things/toggle/${appliance}-${personRoom.name.replace(
          / /g,
          "_"
        )}`,
      });
    });
    // Add action to move to hallway
    actions.push({
      method: "POST",
      url: `http://localhost:8080/api/people/move/${personId}/Hallway`,
    });
  } else {
    // Person is in the hallway
    rooms.forEach((room) => {
      actions.push({
        method: "POST",
        url: `http://localhost:8080/api/people/move/${personId}/${room.name.replace(
          / /g,
          "_"
        )}`,
      });
    });
  }

  return actions;
};

// Get Requests

// Endpoint to get the location of a person in the smart home
app.get("/api/people/location/:personId", (req, res) => {
  const { personId } = req.params;
  const location = determineLocation(personId);
  res.json({ personId, location });
});

app.get("/api/thingDescriptions/all", (req, res) => {
  res.json({ thingDescriptions });
});

// Endpoint to get the actions a person can take within the smart home
app.get("/api/people/getActions/:personId", (req, res) => {
  const { personId } = req.params;
  const actions = determineActions(personId);
  res.json({ personId, actions });
});

// Endpoint to get a person's thing description
app.get("/api/people/description/:personId", (req, res) => {
  const { personId } = req.params;
  const description = peopleDescriptions[personId];

  if (description) {
    res.json(description);
  } else {
    res.status(404).json({ error: "Person description not found" });
  }
});

app.get("/api/thing_description/:applianceId", (req, res) => {
  const { applianceId } = req.params;
  const formattedApplianceID = applianceId.replace(" ", "_");
  const thingDescription = thingDescriptions[formattedApplianceID];

  if (thingDescription) {
    res.json(thingDescription);
  } else {
    res.status(404).json({ error: "Thing description not found" });
  }
});

// Handle fetching status
app.get("/api/things/status/:thingID", (req, res) => {
  const { thingID } = req.params;
  const [applianceType, roomName] = thingID.split("-");
  const formattedRoomName = roomName.split("_").join(" ");
  const formattedApplianceType =
    applianceType.charAt(0).toUpperCase() +
    applianceType.slice(1).toLowerCase();

  const room = rooms.find((room) => room.name === formattedRoomName);
  if (room) {
    const applianceStatus = room.appliances[formattedApplianceType];
    if (applianceStatus !== undefined) {
      res.json({ thingID, status: applianceStatus });
    } else {
      res
        .status(404)
        .json({
          error: `Appliance ${formattedApplianceType} not found in room ${formattedRoomName}.`,
        });
    }
  } else {
    res.status(404).json({ error: `Room ${formattedRoomName} not found.` });
  }
});

// Post requests

// Endpoint to move a person to a room
app.post("/api/people/move/:personId/:roomName", (req, res) => {
  const { personId, roomName } = req.params;

  // console.log(`Moving ${personId} to ${roomName}`);
  movePerson(personId, roomName);

  res.json({ message: `Moved ${personId} to ${roomName} successfully.` });
});

app.post("/forward_to_python", (req, res) => {
  rooms = req.body.rooms || [];
  axios
    .post("http://localhost:8081/generate_rdf", req.body)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      res.status(500).json({ message: "Error: " + error.message });
    });
});

app.post("/api/thing_descriptions", (req, res) => {
  const descriptions = req.body.descriptions;
  // console.log("Received thing descriptions: ", descriptions);

  descriptions.forEach((desc) => {
    const { roomName, thingID, thingType } = desc;
    thingDescriptions[thingID] = desc;

    if (thingType === "Person") {
      peopleDescriptions[thingID] = desc;
    } else {
      if (!roomDescriptions[roomName]) {
        roomDescriptions[roomName] = {
          roomName,
          thingType: "Room",
          description: "A room in a simulated smart home",
          thingDescriptions: {},
        };
      }
      roomDescriptions[roomName].thingDescriptions[thingID] = desc;
    }
  });

  // console.log("Updated room descriptions: ", roomDescriptions);
  // console.log("Updated people descriptions: ", peopleDescriptions);
  res.json({
    message: "Thing descriptions saved and categorized by room successfully",
  });
});

// Handle toggle action
app.post("/api/things/toggle/:thingID", (req, res) => {
  const { thingID } = req.params;
  const thing_description = thingDescriptions[thingID];
  const room_name = thing_description.roomName;
  const thing_type = thing_description.thingType;
  // Logic to toggle the state of the thing identified by thingID
  // console.log(`Toggling state for thingID: ${thingID}`);
  var payload = {
    eventType: "toggleAppliance",
    data: { room: room_name, appliance: thing_type },
  };
  // Emit the event to all sockets except the one that sent it
  io.emit("event", {
    eventType: "toggleAppliance",
    data: payload,
  }); // Respond with success or error message
  res.json({ message: `Toggled state for ${thingID}.` });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
