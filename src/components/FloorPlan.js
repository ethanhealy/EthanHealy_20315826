import React, { useEffect, useRef, useState } from "react";
import p5 from "p5";
import RoomSelector from "./RoomSelector";
import io from "socket.io-client";
import axios from "axios";

const FloorPlan = ({socket, floorWidth, floorHeight, roomSpecs }) => {

  // initialise variables and refs for canvas drawing
  const sketchRef = useRef();
  const [rooms, setRooms] = useState([]);
  const [resetLayoutConfirm, setResetLayoutConfirm] = useState(false);
  const canvasWidth = 1000;
  const canvasHeight = 1000;
  const canvasCenter = { x: canvasWidth / 2 + 75, y: canvasHeight / 2 };
  const [emitLog, setEmitLog] = useState(null);
  const [people, setPeople] = useState({
    Ethan: { ...canvasCenter, x: canvasCenter.x - 125 },
    Ava: { ...canvasCenter, x: canvasCenter.x - 100 }, 
  });
  const [thingDescriptions, setThingDescriptions] = useState([]);

  const returnToHallway = () => {
    setRooms((prevRooms) =>
      prevRooms.map((room) => ({
        ...room,
        people: Object.fromEntries(
          Object.entries(room.people || {}).filter(
            ([person]) => person !== "Ethan" && person !== "Ava"
          )
        ),
      }))
    );

    // Reset the positions of Ethan and Ava to the hallway
    setPeople({
      Ethan: { ...canvasCenter, x: canvasCenter.x - 125 },
      Ava: { ...canvasCenter, x: canvasCenter.x - 100 },
    });

    socket.emit("event", {
      eventType: "logAdded",
      data: `Ethan and Ava went to the hallway`,
    });
  };

  useEffect(() => {
    if (emitLog && socket && socket.connected) {
      const { person, roomName } = emitLog;
      socket.emit("event", {
        eventType: "logAdded",
        data: `${person} moved into ${roomName}`,
      });
      setEmitLog(null); 
    }
  }, [emitLog, socket]);

  // Function to toggle the state of an appliance
  const toggleApplianceState = (roomName, applianceName) => {
    setRooms(
      (prevRooms) => {

        // Find the room where the appliance is located
        const roomIndex = prevRooms.findIndex((room) => room.name === roomName);
        if (roomIndex === -1) {
          console.error(`Room "${roomName}" not found.`);
          return prevRooms;
        }

        // Retrieve the room object
        const room = { ...prevRooms[roomIndex] };

        // Find the appliance within the room
        const appliance = room.appliances[applianceName];
        if (!appliance) {
          console.error(
            `Appliance "${applianceName}" not found in room "${roomName}".`
          );
          return prevRooms;
        }

        // Toggle the state of the appliance
        const newState = appliance === "ON" ? "OFF" : "ON";

        // Emit the event to the server
        socket.emit("event", {
          eventType: "logAdded",
          data: `${applianceName} state in ${roomName} was switched to ${newState}`,
        });

        // Update the state of the appliance within the room
        const updatedRoom = {
          ...room,
          appliances: {
            ...room.appliances,
            [applianceName]: newState,
          },
        };

        // Update the state of the rooms
        const updatedRooms = [...prevRooms];
        updatedRooms[roomIndex] = updatedRoom;
        return updatedRooms;
      }
    );
  };

  const RoomSpecs = roomSpecs;

  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;


  useEffect(() => {

    socket.on("event", (event) => {
      if (event.eventType === "personMoved") {
        movePerson(event.data.person, event.data.room);
      } else if (event.eventType === "toggleAppliance") { 
        toggleApplianceState(event.data.data.room, event.data.data.appliance);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off("event");
      socket.disconnect();
    };
  }, []);

  const resetLayout = () => {
    setRooms([]);
    setPeople({
      Ethan: { ...canvasCenter, x: canvasCenter.x - 125 },
      Ava: { ...canvasCenter, x: canvasCenter.x - 100 },
    });
    socket.emit("event", { dataType: "reset" });
    setResetLayoutConfirm(false);
  };

  const initializeAppliancesForRoom = (roomType) => {
    const initialAppliances = {};
    const roomSpec = roomSpecs[roomType];
    if (roomSpec && roomSpec.appliances) {
      Object.keys(roomSpec.appliances).forEach((applianceName) => {
        initialAppliances[applianceName] = "OFF";
      });
    }
    return initialAppliances;
  };

  const addRoom = (side, roomType) => {
    setRooms((prevRooms) => {
      const roomWidth = roomSpecs[roomType].width;
      const roomHeight = roomSpecs[roomType].height;

      // Calculate total height used by rooms on the specified side
      const totalHeightUsed = prevRooms
        .filter((room) => room.side === side)
        .reduce((acc, room) => acc + room.h, 0);

      // Check available space before adding the new room
      if (floorHeight - totalHeightUsed < roomHeight) {
        alert("Not enough space to add another " + roomType);
        return prevRooms;
      }

      let x;
      if (side === "left") {
        x = 75; // Rooms on the left start from this x position
      } else {
        x = floorWidth - roomWidth + 75; // Correctly position the room against the right wall
      }
      const y = 10 + totalHeightUsed; // Y position based on the total height of existing rooms

      const newRoom = {
        name: `${roomType} ${prevRooms.length + 1}`,
        side,
        roomType,
        x,
        y,
        w: roomWidth,
        h: roomHeight,
        appliances: initializeAppliancesForRoom(roomType),
      };

      if (socket && socket.connected) {
        socket.emit("event", {
          eventType: "roomsUpdated",
          data: [...prevRooms, newRoom],
        });
      }

      return [...prevRooms, newRoom];
    });
  };


  const movePerson = (person, roomName) => {
    // Use the ref to access the most current rooms state
    const prevRooms = roomsRef.current;
  
    // Check if the roomName is "Hallway" and reset the position
    if (roomName === "Hallway") {
      const startPosition = {
        Ethan: { ...canvasCenter, x: canvasCenter.x - 125 },
        Ava: { ...canvasCenter, x: canvasCenter.x - 100 }
      };
  
      setRooms(prevRooms.map((r) => {
        if (r.people && r.people[person]) {
          // Remove person from the previous room
          const updatedPeople = { ...r.people };
          delete updatedPeople[person];
          return {
            ...r,
            people: updatedPeople,
          };
        }
        return r;
      }));
  
      setPeople((prevPeople) => ({
        ...prevPeople,
        [person]: startPosition[person],
      }));
  
      console.log(`Emitting event for ${person} moving into the hallway`);
      setEmitLog({ person, roomName: "Hallway" });
      return;
    }
    
    // If not "Hallway", find the room and calculate the new position
    const room = prevRooms.find((r) => r.name === roomName);
    if (!room) {
      console.error(`Room "${roomName}" not found.`);
      return;
    }
  
    // Calculate the center position of the room
    const centerX = room.x + room.w / 2;
    const centerY = room.y + room.h / 2;
  
    // Adjust position based on the person
    let adjustedX = centerX;
    if (person === "Ava") {
      adjustedX -= 20; // Ava will be 20 pixels to the left of center
    } else if (person === "Ethan") {
      adjustedX += 10; // Ethan will be 10 pixels to the right of center
    }
  
    const newPosition = {
      x: adjustedX,
      y: centerY,
    };
  
    // Update the rooms state to remove the person from the previous room
    const updatedRooms = prevRooms.map((r) => {
      if (r.name === roomName) {
        return {
          ...r,
          people: {
            ...r.people,
            [person]: newPosition,
          },
        };
      } else if (r.people && r.people[person]) {
        // Remove person from the previous room
        const updatedPeople = { ...r.people };
        delete updatedPeople[person];
        return {
          ...r,
          people: updatedPeople,
        };
      }
      return r;
    });
  
    setRooms(updatedRooms);
  
    setPeople((prevPeople) => ({
      ...prevPeople,
      [person]: newPosition,
    }));
  
    console.log(`Emitting event for ${person} moving into ${roomName}`);
    setEmitLog({ person, roomName });
  };
  
  


  useEffect(() => {
    const Sketch = (p) => {
      p.setup = () => {
        p.createCanvas(canvasWidth, canvasHeight);
        p.noLoop();
      };

      const drawHouseOutline = (p) => {
        // indent x, indent y, width, height
        p.rect(75, 10, floorWidth, floorHeight);
      };

      const drawRooms = (p) => {
        rooms.forEach((room) => {
          drawRoom(p, {
            name: room.name,
            x: room.x,
            y: room.y,
            w: room.w,
            h: room.h,
          });

          // Now call the function to draw the room's appliances
          drawRoomAppliances(p, room);

          // Call the function to draw furniture if it exists in roomSpecs
          if (RoomSpecs[room.roomType] && RoomSpecs[room.roomType].furniture) {
            RoomSpecs[room.roomType].furniture(p, room);
          }

          drawDoorToHallway(p, room);
        });
      };

      const drawAppliance = (p, applianceName, x, y, state) => {
        p.fill(state === "ON" ? "yellow" : "gray");
        p.text(`${applianceName}: ${state}`, x, y + 20); 
      };

      const drawRoomAppliances = (p, room) => {
        if (!room.appliances) {
          console.warn(`No appliances found for room: ${room.name}`);
          return;
        }

        let yOffset = 0;
        Object.keys(room.appliances).forEach((applianceName) => {
          drawAppliance(
            p,
            applianceName,
            room.x + 10,
            room.y + 30 + yOffset,
            room.appliances[applianceName]
          );
          yOffset += 20; 
        });
      };

      const drawRoom = (p, room) => {
        p.fill(255); // White rooms
        p.rect(room.x, room.y, room.w, room.h);
        p.textSize(24);
        p.fill(0); // Black text
        p.text(room.name, room.x + 10, room.y + 30);
      };

      const drawDoorToHallway = (p, room) => {
        let doorWidth = 10;
        let doorHeight = 50;
        let doorX = room.side === "left" ? room.x + room.w - doorWidth : room.x; // door should be on the side facing the hallway
        let doorY = room.y + room.h / 2 - doorHeight / 2; // centered vertically on the wall
        p.fill(255); // color the door differently for visibility
        p.rect(doorX, doorY, doorWidth, doorHeight);
      };

      // Additional function to draw people in the rooms
      const drawPeople = (p) => {
        Object.entries(people).forEach(([name, position]) => {
          if (position) {
            const { x, y } = position;
            p.fill(name === "Ava" ? [255, 105, 180] : [0, 102, 153]); // Pink for Ava, different color for Ethan
            p.ellipse(x, y, 20, 20); // Draw the person

            // Adjust text position based on the name
            const textX = x - 20;
            const textY = name === "Ava" ? y - 20 : y + 35;
            p.text(name, textX, textY);
          }
        });
      };

      p.draw = () => {
        p.background(220);
        drawHouseOutline(p);
        drawRooms(p);
        drawPeople(p);
      };
    };

    const myp5 = new p5(Sketch, sketchRef.current);

    return () => {
      myp5.remove();
    };
  }, [rooms, people, floorHeight, floorWidth]);

  useEffect(() => {
    if (rooms.length) {
      console.log("rooms: ", JSON.stringify(rooms));

      // Make a POST request to the Python Flask server
      axios.post(`http://localhost:8080/forward_to_python`, {rooms})
        .then((response) => {
          console.log(response.data);
          handleLights(response.data)
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, [rooms]);

  useEffect(() => {
    if (rooms.length) {
      // Initialize descriptions array
      const descriptions = [];
      const peopleDescriptions = [];
  
      // Construct appliance descriptions
      rooms.forEach(room => {
        const roomName = room.name.replace(/ /g, '_');
        Object.keys(room.appliances).forEach(appliance => {
          const thingID = `${appliance}-${roomName}`;
          descriptions.push({
            thingType: appliance,
            thingID: thingID,
            roomName: room.name,
            description: `A smart ${appliance.toLowerCase()} capable of being toggled on and off.`,
            actions: {
              toggle: {
                method: "POST",
                url: `http://localhost:8080/api/things/toggle/${thingID}`,
              }
            },
            status: {
              method: "GET",
              url: `http://localhost:8080/api/things/status/${thingID}`,
            },
          });
        });
      });
  
      // Construct people descriptions
      const people = ['Ava', 'Ethan'];
      people.forEach(person => {
        peopleDescriptions.push({
          thingType: "Person",
          thingID: person,
          description: `${person} is a person in the smart home`,
          status: {
            method: "GET",
            url: `http://localhost:8080/api/people/location/${person}`
          },
          actions: {
            method: "GET",
            url: `http://localhost:8080/api/people/getActions/${person}`
          }
        });
      });
  
      // Combine appliance and people descriptions
      const combinedDescriptions = descriptions.concat(peopleDescriptions);
  
      setThingDescriptions(combinedDescriptions);
  
      // Send descriptions to backend
      axios.post(`http://localhost:8080/api/thing_descriptions`, { descriptions: combinedDescriptions })
        .then(response => {
          console.log('Thing descriptions processed', response.data);
        })
        .catch(error => {
          console.error('Error sending thing descriptions', error);
        });
    }
  }, [rooms]);
  
  useEffect(()=>{
    console.log(JSON.stringify(thingDescriptions));
  },[thingDescriptions])

  const handleLights = (data) => {
    if(data.lightToggle.roomsWithLightsOnAndNoPeople.length){
      data.lightToggle.roomsWithLightsOnAndNoPeople.forEach(element => {
          toggleApplianceState(element, "Light")
        });
    }
    if(data.lightToggle.roomsWithPeopleAndLightsOff.length){
      data.lightToggle.roomsWithPeopleAndLightsOff.forEach(element => {
        toggleApplianceState(element, "Light")
      });
    }
    
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
            <button onClick={returnToHallway}>Return Ethan and Ava to Hallway</button>
      <RoomSelector onAddRoom={addRoom} rooms={roomSpecs} />
      <div>
        {resetLayoutConfirm ? (
          <div style={{ marginTop: 10, marginBottom: 10 }}>
            Are you sure you want to reset layout?
            <button className="greenButton" onClick={resetLayout}>
              Yes, reset
            </button>
            <button
              className="redButton"
              style={{ marginLeft: 10, marginRight: 10 }}
              onClick={() => setResetLayoutConfirm(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="blueButton"
            onClick={() => setResetLayoutConfirm(true)}
          >
            Reset Layout
          </button>
        )}
      </div>
      <div ref={sketchRef}></div>
    </div>
  );
};

export default FloorPlan;
