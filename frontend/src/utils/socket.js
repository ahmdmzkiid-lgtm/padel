import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); // Adjust to your production URL if needed

export default socket;
