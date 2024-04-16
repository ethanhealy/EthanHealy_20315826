import React, { useState } from 'react';

const RoomSelector = ({ onAddRoom, rooms }) => {
  console.log(rooms)
  const [selectedRoom, setSelectedRoom] = useState('');

  const handleRoomSelection = (roomType) => {
    setSelectedRoom(roomType);
  };

  const handleAddRoom = (side) => {
    if (side && selectedRoom) {
      onAddRoom(side, selectedRoom);
    }
    setSelectedRoom(''); // Reset or cancel
  };

  // Create buttons for each room in the rooms object
  const roomButtons = Object.keys(rooms).map((roomName) => (
    <button key={roomName} className='blackButton' onClick={() => handleRoomSelection(roomName)}>
      {`Add ${roomName}`}
    </button>
  ));

  return (
    <div>
      {!selectedRoom && (
        <>
          {roomButtons}
        </>
      )}
      {selectedRoom && (
        <>
          <button className='blackButton' onClick={() => handleAddRoom('left')}>Add to Left</button>
          <button className='blackButton' onClick={() => handleAddRoom('right')}>Add to Right</button>
          <button className='redButton' onClick={() => setSelectedRoom('')}>Cancel</button>
        </>
      )}
    </div>
  );
};

export default RoomSelector;
