import { io } from 'socket.io-client';

// Auto-detect URL: If prod, use window.location.hostname
const isProd = window.location.hostname !== 'localhost';
const URL = isProd ? 'http://120.55.247.13/socket.io' : 'http://localhost:3001';

// We need path option if we are proxying via Nginx /socket.io/
// But standard socket.io client handles it if we pass simple URL usually.
// Nginx config: location /socket.io/ proxy_pass ...
// Client: default path is /socket.io/

export const socket = io(isProd ? '/' : 'http://localhost:3001', {
    autoConnect: false,
    transports: ['websocket', 'polling'] // Force websocket usually better
});
