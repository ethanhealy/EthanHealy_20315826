import React, { useState, useEffect } from "react";
import io from "socket.io-client";

function Controller() {
  const [selectedPerson, setSelectedPerson] = useState("");
  const [rooms, setRooms] = useState([]); 
  const [logs, setLogs] = useState([]);
  const [viewThingDescription, setViewThingDescription] = useState(false);
  const [personActions, setPersonActions] = useState([]);
  const [selectedPersonThingDescription, setSelectedPersonThingDescription] =
    useState("");
    const [actionCount, setActionCount] = useState(0); // State to track action invocations

  const toggleView = () => {
    setViewThingDescription(!viewThingDescription);
  };

  // Initialize Socket.IO when the component mounts
  useEffect(() => {
    const newSocket = io(`http://localhost:8080`);

    newSocket.on("event", (event) => {
      // console.log("Event received:", event);
      if (event.eventType === "logAdded") {
        const timestamp = new Date(Date.now());
        const formattedTimestamp = `${timestamp
          .getDate()
          .toString()
          .padStart(2, "0")}/${(timestamp.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${timestamp.getFullYear()} ${timestamp
          .getHours()
          .toString()
          .padStart(2, "0")}:${timestamp
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${timestamp
          .getSeconds()
          .toString()
          .padStart(2, "0")}`;

        setLogs((prevLogs) => [
          `${event.data} ${formattedTimestamp}`,
          ...prevLogs,
        ]);
      } else if (event.eventType === "roomsUpdated") {
        // console.log("roomsUpdated event received");
        setRooms(event.data);
      }
    });
    newSocket.on("reset", (event) => {
        setRooms([]); 
    });

    // Cleanup on unmount
    return () => {
      newSocket.off("event");
      newSocket.off("reset");
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchPersonActions = async () => {
      if (selectedPerson) {
        try {
          // Fetch the actions available to the selected person
          const actionsResponse = await fetch(
            `http://localhost:8080/api/people/getActions/${selectedPerson}`
          );
          if (!actionsResponse.ok) {
            throw new Error(`HTTP error! status: ${actionsResponse.status}`);
          }
          const actionsData = await actionsResponse.json();
          setPersonActions(actionsData.actions || []);
        } catch (error) {
          console.error(
            `Failed to fetch actions for ${selectedPerson}:`,
            error
          );
          setPersonActions([]); 
        }
      } else {
        setPersonActions([]); // Reset actions when no person is selected
      }
    };

    fetchPersonActions();
  }, [selectedPerson, rooms, actionCount]); // bool is added as a lazy way to re-render state

  useEffect(()=>{
    if(rooms.length===0){
      setPersonActions([]);
    }
  },[rooms])

  const performAction = async (url) => {

    try {
      const response = await fetch(url, { method: "POST" });
      if (response.ok) {
        setActionCount(prevCount => prevCount + 1);
        const result = await response.json();
        // console.log(result);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to perform action:", error);
    }
  };

  useEffect(() => {
    const fetchPersonDescription = async () => {
      if (selectedPerson) {
        try {
          const response = await fetch(
            `http://localhost:8080/api/people/description/${selectedPerson}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const description = await response.json();
          setSelectedPersonThingDescription(description);
          // setPersonDescription(description); // Update your state with this description
        } catch (error) {
          console.error(
            `Failed to fetch description for ${selectedPerson}:`,
            error
          );
        }
      }
    };

    fetchPersonDescription();
  }, [selectedPerson]);

  return (
    <div style={{ flex: 1, backgroundColor: "green", height: "100%" }}>
      <div style={{display:'flex', flexDirection:'column', width:'fit-content'}}>
      <div>
        <label>Select Person:</label>
        <select
          className="blackButton"
          value={selectedPerson}
          onChange={(e) => setSelectedPerson(e.target.value)}
        >
          <option value="">Select a person</option>
          <option value="Ethan">Ethan</option>
          <option value="Ava">Ava</option>
        </select>
      </div>
      
        {personActions.map((action, index) => {
          console.log(action);
          if(!action.url.includes("Light-"))
          return (
            <button
              key={index}
              onClick={() => {
                performAction(action.url)
              }}
              className="blackButton"
            >
              {action.url.replace("http://localhost:8080", "")}
            </button>
          );
        })}

      {/* Toggle View Button */}
      <button
        style={{ display: "block" }}
        className="blackButton"
        onClick={toggleView}
      >
        {viewThingDescription ? "View Logs" : "View Thing Description"}
      </button>
      </div>
      {/* Conditional rendering based on thingDescription state */}
      {viewThingDescription ? (
        <div
          style={{
            width: "90%",
            height: "80%",
            backgroundColor: "white",
            borderRadius: 20,
            border: "1px solid gray",
            marginLeft: 10,
            marginRight: 10,
            padding: 10,
          }}
        >
          {selectedPerson !== "" ? (
            <>
              <div>Thing Descriptions for {selectedPerson}: </div>
              <pre>
                {JSON.stringify(selectedPersonThingDescription, null, 2)}
              </pre>
            </>
          ) : (
            <div>Select a person to see what they can see</div>
          )}
        </div>
      ) : (
        <div
          style={{
            width: "90%",
            height: "80%",
            backgroundColor: "white",
            borderRadius: 20,
            border: "1px solid gray",
            marginLeft: 10,
            marginRight: 10,
            padding: 10,
          }}
        >
          Logs:
          <div style={{overflow:'scroll', height:'90%'}}>
            {logs.map((log, index) => (
              <>
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    color: "gray",
                    fontSize: "14px",
                  }}
                >
                  {log}
                </div>
                <div
                  style={{
                    borderBottom: "2px solid gray",
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                />
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Controller;
