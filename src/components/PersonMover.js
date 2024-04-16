import React, { useState } from 'react';

const PersonMover = ({ rooms, onMovePerson }) => {
  const [selectedRoom, setSelectedRoom] = useState({ Ethan: '', Ava: '' });

  const handleMovePerson = (person) => {
    if (selectedRoom[person]) {
      onMovePerson(person, selectedRoom[person]);
      setSelectedRoom({ ...selectedRoom, [person]: '' }); // Reset the selected room for this person
    }
  };

  return (
    <div>
      {['Ethan', 'Ava'].map(person => (
        <div key={person}>
          <label>Move {person}:</label>
          <select
            value={selectedRoom[person]}
            onChange={(e) => setSelectedRoom({ ...selectedRoom, [person]: e.target.value })}
          >
            <option value="">Select a room</option>
            {rooms.map(room => (
              <option key={room.name} value={room.name}>
                {room.name}
              </option>
            ))}
          </select>
          <button onClick={() => handleMovePerson(person)}>
            Move
          </button>
        </div>
      ))}
    </div>
  );
};

export default PersonMover;
