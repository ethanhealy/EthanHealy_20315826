import React, { useState, useEffect, useRef } from "react";
import p5 from "p5";

const RoomDimensionsForm = ({
  floorWidth,
  floorHeight,
  onComplete,
  useEzRooms,
}) => {
  const [roomName, setRoomName] = useState("");
  const [roomWidth, setRoomWidth] = useState("");
  const [roomHeight, setRoomHeight] = useState("");
  const [rooms, setRooms] = useState({});
  const [applianceNames, setApplianceNames] = useState([]);

  const handleAddRoom = () => {
    if (!roomName || rooms[roomName]) {
      alert("Room name must be unique and not empty.");
      return;
    }

    const numericRoomWidth = parseInt(roomWidth, 10);
    const numericRoomHeight = parseInt(roomHeight, 10);

    if (numericRoomWidth > floorWidth / 2 - 5) {
      alert(`Room width cannot exceed half the ground floor width minus 5.`);
      return;
    }

    if (numericRoomHeight > floorHeight) {
      alert(`Room height cannot exceed the ground floor height.`);
      return;
    }
    var applianceObjects = []
    if(applianceNames!=="" && applianceNames.includes(","))
    applianceObjects = applianceNames
      .split(",")
      .filter((appliance) => appliance.trim() !== "")
      .reduce((acc, appliance) => {
        acc[appliance.trim()] = { state: "OFF" };
        return acc;
      }, {});

    setRooms((prevRooms) => ({
      ...prevRooms,
      [roomName]: {
        width: numericRoomWidth,
        height: numericRoomHeight,
        appliances: applianceObjects, // Add appliances to the room
        people: [],
      },
    }));

    setRoomName("");
    setRoomWidth("");
    setRoomHeight("");
  };

  const roomSketchRef = useRef();

  useEffect(() => {
    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(floorWidth, floorHeight);
      };

      p.draw = () => {
        p.background(220);
        p.noFill();
        p.stroke(0);
        p.rect(0, 0, floorWidth, floorHeight); // Draw the floor

        // Draw the room on top of the floor for reference
        const w = roomWidth ? parseInt(roomWidth, 10) : 0;
        const h = roomHeight ? parseInt(roomHeight, 10) : 0;
        p.fill(255);
        p.rect(0, 0, w, h);
      };
    };

    let myp5 = new p5(sketch, roomSketchRef.current);

    return () => {
      myp5.remove();
    };
  }, [roomWidth, roomHeight, floorWidth, floorHeight]);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", width: 800 }}>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <div style={{ marginRight: 10 }}>Room Name:</div>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <div style={{ marginRight: 10 }}>Width:</div>
          <input
            type="number"
            min="1"
            value={roomWidth}
            onChange={(e) => setRoomWidth(parseInt(e.target.value, 10))}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          Height:
          <input
            type="number"
            min="1"
            value={roomHeight}
            onChange={(e) => setRoomHeight(parseInt(e.target.value, 10))}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          Appliance Names (seperated by ","):
          <input
            type="text"
            value={applianceNames}
            onChange={(e) => setApplianceNames(e.target.value)}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <div />
          <button
            style={{ maxWidth: 200 }}
            onClick={() => handleAddRoom(floorWidth, floorHeight)}
          >
            Add Room
          </button>
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <div />
          <button style={{ maxWidth: 200 }} onClick={useEzRooms}>
            Use pre-made room setup
          </button>
        </label>
        {Object.keys(rooms).length ? 
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <div />
          <button style={{ maxWidth: 200 }} onClick={() => onComplete(rooms)}>
            Complete Setup
          </button>
        </label>
      : ""}
      </div>
      <ul>
        {Object.entries(rooms).map(([name, { width, height }]) => (
          <li key={name}>{`${name}: ${width}x${height}`}</li>
        ))}
      </ul>
      <div ref={roomSketchRef} /> 
    </div>
  );
};

const FloorForm = ({ width, height, onSetupComplete }) => {
  const sketchRef = useRef();

  useEffect(() => {
    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(width, height);
      };

      p.draw = () => {
        p.background(220);
        p.fill(200);
        p.rect(0, 0, width, height);
      };
    };

    let myp5 = new p5(sketch, sketchRef.current);

    return () => {
      myp5.remove();
    };
  }, [width, height]);

  // ezRooms definition with dynamic drawing logic
  const ezRooms = {
    Bathroom: {
      width: 200,
      height: 250,
      appliances: {
        Light: { state: "OFF" },
        Heater: { state: "OFF" },
        Bath: { state: "OFF" },
        Sink: { state: "OFF" },
        Toilet: { state: "OFF" },
      },
      people: [],
    },
    Bedroom: {
      width: 300,
      height: 350,
      appliances: {
        Light: { state: "OFF" },
        Heater: { state: "OFF" },
        Bed: { state: "OFF" },
      },
      people: [],
    },
    Kitchen: {
      width: 300,
      height: 300,
      appliances: {
        Light: { state: "OFF" },
        Heater: { state: "OFF" },
        Stove: { state: "OFF" },
        Fridge: { state: "OFF" },
        Sink: { state: "OFF" },
      },
      people: [],
    },
    LivingRoom: {
      width: 320,
      height: 300,
      appliances: {
        Light: { state: "OFF" },
        Heater: { state: "OFF" },
        TV: { state: "OFF" },
      },
      people: [],
    },
  };

  const useEzRooms = () => {
    onSetupComplete(ezRooms);
  };

  return (
    <div style={{ margin: 10 }}>
      <RoomDimensionsForm
        useEzRooms={useEzRooms}
        onComplete={(rooms) => onSetupComplete(rooms)}
        floorWidth={width}
        floorHeight={height}
      />
    </div>
  );
};

export default FloorForm;
