/**
 * Matchmaking Engine for NearChat
 * In-memory high performance matching queue with strict 30 km radius restriction.
 */

import crypto from 'crypto';
import { config } from '../config.js';
import { calculateHaversineDistance, isValidCoordinates, formatDistanceRange } from '../utils/haversine.js';

/**
 * Queue of users waiting for a match:
 * socketId -> { socketId, lat, lng, mode: 'text'|'video', blockedIds: Set<string>, joinedAt: number, ipHash: string }
 */
export const waitingQueue = new Map();

/**
 * All currently connected and located users (for accurate localized online_count calculation):
 * socketId -> { socketId, lat, lng, inQueue: boolean, roomId: string | null }
 */
export const activeUsers = new Map();

/**
 * Active chat rooms:
 * roomId -> { roomId, mode: 'text'|'video', u1: socketEntry, u2: socketEntry, createdAt: number }
 */
export const activeRooms = new Map();

/**
 * Quick mapping from socketId -> roomId
 */
export const socketToRoomMap = new Map();

/**
 * Persistent session blocked pairs per socket:
 * socketId -> Set<blockedSocketId>
 */
export const sessionBlockMap = new Map();

/**
 * Computes how many users are currently active within MAX_RADIUS_KM (30 km) of a given coordinate.
 */
export function getOnlineCountNear(lat, lng) {
  if (!isValidCoordinates(lat, lng)) return 0;
  let count = 0;
  for (const user of activeUsers.values()) {
    if (isValidCoordinates(user.lat, user.lng)) {
      const dist = calculateHaversineDistance(lat, lng, user.lat, user.lng);
      if (dist <= config.MAX_RADIUS_KM) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Broadcasts localized online_count to all active sockets periodically or on status change.
 */
export function broadcastOnlineCounts(io) {
  for (const [socketId, user] of activeUsers.entries()) {
    if (isValidCoordinates(user.lat, user.lng)) {
      const count = getOnlineCountNear(user.lat, user.lng);
      io.to(socketId).emit('online_count', {
        count,
        radiusKm: config.MAX_RADIUS_KM
      });
    }
  }
}

/**
 * Attempts to match a specific waiting user with the closest eligible peer in the queue.
 * Strict rules:
 * - Same mode ('text' or 'video')
 * - Haversine distance <= MAX_RADIUS_KM (30 km)
 * - Neither has blocked the other
 * - Distinct socket IDs
 * - Closest candidate is selected
 * @returns {object | null} Matched pair details or null
 */
export function tryMatchUser(socketId, io) {
  const candidate = waitingQueue.get(socketId);
  if (!candidate) return null;

  let closestPeer = null;
  let minDistance = Infinity;

  // Scan all other waiting users
  for (const [otherId, other] of waitingQueue.entries()) {
    if (otherId === socketId) continue;
    if (other.mode !== candidate.mode) continue;

    // Check block lists (both directions)
    const candBlocks = sessionBlockMap.get(socketId);
    const otherBlocks = sessionBlockMap.get(otherId);
    if (candBlocks && candBlocks.has(otherId)) continue;
    if (otherBlocks && otherBlocks.has(socketId)) continue;

    // Haversine distance computation
    const distance = calculateHaversineDistance(
      candidate.lat,
      candidate.lng,
      other.lat,
      other.lng
    );

    // Hard boundary: NEVER match beyond MAX_RADIUS_KM (30 km)
    if (distance <= config.MAX_RADIUS_KM) {
      if (distance < minDistance) {
        minDistance = distance;
        closestPeer = other;
      }
    }
  }

  // If a valid candidate within 30 km is found, create the room
  if (closestPeer) {
    const peerId = closestPeer.socketId;

    // Remove both peers from waiting queue
    waitingQueue.delete(socketId);
    waitingQueue.delete(peerId);

    // Create unique room
    const roomId = `room_${crypto.randomUUID()}`;
    const distanceRange = formatDistanceRange(minDistance);

    // Save active room
    activeRooms.set(roomId, {
      roomId,
      mode: candidate.mode,
      u1: { socketId, lat: candidate.lat, lng: candidate.lng, ipHash: candidate.ipHash },
      u2: { socketId: peerId, lat: closestPeer.lat, lng: closestPeer.lng, ipHash: closestPeer.ipHash },
      createdAt: Date.now()
    });

    socketToRoomMap.set(socketId, roomId);
    socketToRoomMap.set(peerId, roomId);

    // Join both sockets to socket.io room
    const socket1 = io.sockets.sockets.get(socketId);
    const socket2 = io.sockets.sockets.get(peerId);

    if (socket1) socket1.join(roomId);
    if (socket2) socket2.join(roomId);

    // Emit 'matched' to both peers.
    // User 1 is designated initiator (creates WebRTC offer if mode === 'video').
    // Only obfuscated distance range is emitted—raw lat/lng is strictly withheld.
    if (socket1) {
      socket1.emit('matched', {
        roomId,
        distanceRange,
        initiator: true,
        mode: candidate.mode,
        partnerId: peerId
      });
    }

    if (socket2) {
      socket2.emit('matched', {
        roomId,
        distanceRange,
        initiator: false,
        mode: candidate.mode,
        partnerId: socketId
      });
    }

    // Update activeUsers status
    const u1Active = activeUsers.get(socketId);
    if (u1Active) { u1Active.inQueue = false; u1Active.roomId = roomId; }
    const u2Active = activeUsers.get(peerId);
    if (u2Active) { u2Active.inQueue = false; u2Active.roomId = roomId; }

    return { roomId, u1: socketId, u2: peerId, distance: minDistance };
  }

  return null;
}

/**
 * Recurring matchmaking loop (executes every 3 seconds)
 * Iterates through all waiting queue members and pairs up nearby strangers.
 */
export function runMatchmakerCycle(io) {
  if (waitingQueue.size < 2) return;

  const queueKeys = Array.from(waitingQueue.keys());
  for (const socketId of queueKeys) {
    if (waitingQueue.has(socketId)) {
      tryMatchUser(socketId, io);
    }
  }
}

/**
 * Adds a user to the matchmaking queue after verifying coordinates and bans.
 */
export function enqueueUser({ socketId, lat, lng, mode, ipHash }, io) {
  // Validate mode
  const validMode = mode === 'video' ? 'video' : 'text';

  // Validate coordinates
  if (!isValidCoordinates(lat, lng)) {
    return { success: false, error: 'Invalid location coordinates.' };
  }

  // Remove user from any existing room first
  leaveRoom(socketId, io);

  // Register in active users
  activeUsers.set(socketId, {
    socketId,
    lat,
    lng,
    inQueue: true,
    roomId: null
  });

  // Put into waiting queue
  waitingQueue.set(socketId, {
    socketId,
    lat,
    lng,
    mode: validMode,
    joinedAt: Date.now(),
    ipHash
  });

  // Attempt immediate match
  const matchResult = tryMatchUser(socketId, io);

  // If no immediate match found, emit 'searching' status
  if (!matchResult) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      const nearCount = getOnlineCountNear(lat, lng);
      socket.emit('searching', {
        message: `Searching for people within ${config.MAX_RADIUS_KM} km...`,
        onlineCountNear: nearCount,
        mode: validMode
      });
      socket.emit('online_count', {
        count: nearCount,
        radiusKm: config.MAX_RADIUS_KM
      });
    }
  }

  return { success: true };
}

/**
 * Removes user from the waiting queue.
 */
export function dequeueUser(socketId) {
  const existed = waitingQueue.delete(socketId);
  const active = activeUsers.get(socketId);
  if (active) active.inQueue = false;
  return existed;
}

/**
 * Handles leaving an active chat room or skipping to 'next'.
 * Emits 'partner_left' to the remaining peer and tears down the room.
 */
export function leaveRoom(socketId, io) {
  const roomId = socketToRoomMap.get(socketId);
  if (!roomId) return null;

  const room = activeRooms.get(roomId);
  if (room) {
    const partnerId = room.u1.socketId === socketId ? room.u2.socketId : room.u1.socketId;

    // Clean up room mappings
    socketToRoomMap.delete(socketId);
    socketToRoomMap.delete(partnerId);
    activeRooms.delete(roomId);

    // Notify partner that peer has left
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.leave(roomId);
      partnerSocket.emit('partner_left', {
        message: 'Stranger has disconnected.'
      });
      const pActive = activeUsers.get(partnerId);
      if (pActive) pActive.roomId = null;
    }

    const currentSocket = io.sockets.sockets.get(socketId);
    if (currentSocket) {
      currentSocket.leave(roomId);
      const cActive = activeUsers.get(socketId);
      if (cActive) cActive.roomId = null;
    }

    return { roomId, partnerId };
  }

  socketToRoomMap.delete(socketId);
  return null;
}

/**
 * Complete cleanup on socket disconnect
 */
export function handleSocketDisconnect(socketId, io) {
  dequeueUser(socketId);
  leaveRoom(socketId, io);
  activeUsers.delete(socketId);
  sessionBlockMap.delete(socketId);
}
