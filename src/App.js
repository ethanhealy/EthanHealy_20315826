import React, { useEffect, useState } from 'react';
import './App.css';
import Controller from './components/Controller';
import FloorPlan from './components/FloorPlan';
import FloorForm from './components/buildingSetup/FloorForm';
import { io } from 'socket.io-client';

const App = () => {
  const [buildingSetupComplete, setBuildingSetupComplete] = useState(false)
  const [height, setHeight] = useState(800)
  const [width, setWidth] = useState(800)
  const [rooms, setRooms] = useState([]);
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const newSocket = io(`http://localhost:8080`);

    // Listen for successful connection
    newSocket.on("connect", () => {
      console.log("Socket successfully connected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSetupComplete = (finalizedRooms) => {
    console.log(finalizedRooms)
    setRooms(finalizedRooms);
    setBuildingSetupComplete(true);
  };

  return (
    <>
    {buildingSetupComplete ? 
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <div style={{ flex: 1, display: 'flex' }}>
        <FloorPlan socket={socket} roomSpecs={rooms} floorWidth={width} floorHeight={height} style={{ flex: 1 }} />
      </div>
      <div style={{ flex: 1, backgroundColor: 'green' }}>
        <Controller/>
      </div>
    </div>
    : <FloorForm 
        width={width} 
        setWidth={setWidth} 
        height={height} 
        setHeight={setHeight} 
        onSetupComplete={handleSetupComplete}
      />
    }
    </>
  );
}

export default App;
