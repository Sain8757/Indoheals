import { io } from "socket.io-client";

// In production, this should point to your actual backend domain.
// Adjust the port if your backend runs on a different port.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
