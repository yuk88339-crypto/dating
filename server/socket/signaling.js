/**
 * WebRTC Signaling, Messaging, and Safety Handlers
 */

import { config } from '../config.js';
import {
  waitingQueue,
  activeRooms,
  socketToRoomMap,
  sessionBlockMap,
  activeUsers,
  enqueueUser,
  dequeueUser,
  leaveRoom,
  handleSocketDisconnect,
  broadcastOnlineCounts
} from './matchmaking.js';
import {
  hashIpAddress,
  checkNextRateLimit,
  checkMessageRateLimit,
  sanitizeAndFilterMessage,
  cleanupSocketRateLimits
} from '../middleware/rateLimit.js';
import { Report } from '../models/Report.js';
import { Ban } from '../models/Ban.js';

/**
 * Initializes all socket.io event handlers on a newly connected socket.
 */
export function setupSignalingHandlers(io, socket) {
  // Extract client IP and create one-way SHA-256 hash
  const rawIp =
    socket.handshake.headers['x-forwarded-for']?.split(',')[0] ||
    socket.handshake.address ||
    socket.conn.remoteAddress ||
    '127.0.0.1';
  const ipHash = hashIpAddress(rawIp);

  // Store user session state
  socket.data.ipHash = ipHash;
  if (!sessionBlockMap.has(socket.id)) {
    sessionBlockMap.set(socket.id, new Set());
  }

  // 1. Check if user is currently banned
  Ban.isBanned(ipHash).then(({ isBanned, ban }) => {
    if (isBanned) {
      socket.emit('banned', {
        reason: ban?.reason || 'Account suspended for community guidelines violations.',
        expiresAt: ban?.expiresAt
      });
      socket.disconnect(true);
    }
  }).catch(err => {
    console.error('Error verifying ban status:', err);
  });

  /**
   * Event: join_queue
   * Payload: { lat: number, lng: number, mode: 'text' | 'video' }
   */
  socket.on('join_queue', async (data) => {
    try {
      // Re-verify ban status
      const { isBanned, ban } = await Ban.isBanned(ipHash);
      if (isBanned) {
        socket.emit('banned', {
          reason: ban?.reason || 'Access denied due to active ban.',
          expiresAt: ban?.expiresAt
        });
        socket.disconnect(true);
        return;
      }

      const { lat, lng, mode } = data || {};
      const result = enqueueUser(
        {
          socketId: socket.id,
          lat,
          lng,
          mode: mode === 'video' ? 'video' : 'text',
          ipHash
        },
        io
      );

      if (!result.success) {
        socket.emit('error_msg', { message: result.error });
      }
    } catch (err) {
      console.error('Error handling join_queue:', err);
      socket.emit('error_msg', { message: 'Failed to join matchmaking queue.' });
    }
  });

  /**
   * Event: leave_queue
   */
  socket.on('leave_queue', () => {
    dequeueUser(socket.id);
  });

  /**
   * Event: next
   * Skips current partner and re-queues for a new stranger within 30 km
   */
  socket.on('next', async () => {
    // Rate limit: max 1 next per 2 seconds
    const rateCheck = checkNextRateLimit(socket.id);
    if (!rateCheck.allowed) {
      socket.emit('error_msg', { message: rateCheck.message });
      return;
    }

    const currentCoords = activeUsers.get(socket.id);
    const prevRoomId = socketToRoomMap.get(socket.id);
    let prevMode = 'text';

    if (prevRoomId && activeRooms.has(prevRoomId)) {
      prevMode = activeRooms.get(prevRoomId).mode;
    }

    // Leave current room
    leaveRoom(socket.id, io);

    // Re-queue if coordinates are known
    if (currentCoords && currentCoords.lat !== undefined && currentCoords.lng !== undefined) {
      enqueueUser(
        {
          socketId: socket.id,
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          mode: prevMode,
          ipHash
        },
        io
      );
    }
  });

  /**
   * Event: send_message
   * Payload: { text: string }
   */
  socket.on('send_message', (data) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) {
      socket.emit('error_msg', { message: 'You are not in an active conversation.' });
      return;
    }

    // Rate limit check: max 5 messages per 3 seconds
    const rateCheck = checkMessageRateLimit(socket.id);
    if (!rateCheck.allowed) {
      socket.emit('error_msg', { message: rateCheck.message });
      return;
    }

    const rawText = data?.text || '';
    if (!rawText.trim()) return;

    // Sanitize and filter offensive profanity
    const cleanText = sanitizeAndFilterMessage(rawText);

    // Forward to partner in room
    socket.to(roomId).emit('partner_message', {
      text: cleanText,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    });
  });

  /**
   * Event: typing
   * Payload: { isTyping: boolean }
   */
  socket.on('typing', (data) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('partner_typing', {
        isTyping: Boolean(data?.isTyping)
      });
    }
  });

  /**
   * WebRTC Signaling: webrtc_offer
   */
  socket.on('webrtc_offer', (data) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (roomId && data?.offer) {
      socket.to(roomId).emit('webrtc_offer', {
        offer: data.offer
      });
    }
  });

  /**
   * WebRTC Signaling: webrtc_answer
   */
  socket.on('webrtc_answer', (data) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (roomId && data?.answer) {
      socket.to(roomId).emit('webrtc_answer', {
        answer: data.answer
      });
    }
  });

  /**
   * WebRTC Signaling: webrtc_ice
   */
  socket.on('webrtc_ice', (data) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (roomId && data?.candidate) {
      socket.to(roomId).emit('webrtc_ice', {
        candidate: data.candidate
      });
    }
  });

  /**
   * Event: block
   * Blocks the current partner for the duration of the session
   */
  socket.on('block', () => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return;

    const room = activeRooms.get(roomId);
    if (room) {
      const partnerId = room.u1.socketId === socket.id ? room.u2.socketId : room.u1.socketId;

      // Add to session block lists
      const userBlocks = sessionBlockMap.get(socket.id) || new Set();
      userBlocks.add(partnerId);
      sessionBlockMap.set(socket.id, userBlocks);

      // Tear down room
      leaveRoom(socket.id, io);
    }
  });

  /**
   * Event: report
   * Payload: { reason: 'nudity' | 'harassment' | 'spam' | 'other' }
   */
  socket.on('report', async (data) => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) {
      socket.emit('error_msg', { message: 'No active partner to report.' });
      return;
    }

    const room = activeRooms.get(roomId);
    if (!room) return;

    const reportedUser = room.u1.socketId === socket.id ? room.u2 : room.u1;
    const reason = ['nudity', 'harassment', 'spam', 'other'].includes(data?.reason)
      ? data.reason
      : 'other';

    try {
      // 1. Record report in MongoDB / fallback memory
      await Report.create({
        reporterIpHash: ipHash,
        reportedIpHash: reportedUser.ipHash,
        reason,
        roomId
      });

      // 2. Count reports against reported user within last 24h
      const recentReports = await Report.countRecentForReported(reportedUser.ipHash);

      // 3. Auto-ban if threshold (3 reports) is reached
      if (recentReports >= config.BAN_THRESHOLD_REPORTS) {
        const ban = await Ban.createOrUpdate({
          ipHash: reportedUser.ipHash,
          reason: 'Accumulated 3 or more community safety reports.',
          reportCount: recentReports,
          durationMs: config.BAN_DURATION_MS
        });

        // Notify reported user and disconnect
        const reportedSocket = io.sockets.sockets.get(reportedUser.socketId);
        if (reportedSocket) {
          reportedSocket.emit('banned', {
            reason: ban.reason,
            expiresAt: ban.expiresAt
          });
          reportedSocket.disconnect(true);
        }
      }

      // 4. Block and disconnect from partner immediately
      const userBlocks = sessionBlockMap.get(socket.id) || new Set();
      userBlocks.add(reportedUser.socketId);
      sessionBlockMap.set(socket.id, userBlocks);

      leaveRoom(socket.id, io);
      socket.emit('error_msg', { message: 'Report submitted. You have been disconnected from this user.' });
    } catch (err) {
      console.error('Error submitting report:', err);
      socket.emit('error_msg', { message: 'Failed to process report.' });
    }
  });

  /**
   * Event: disconnect
   */
  socket.on('disconnect', () => {
    cleanupSocketRateLimits(socket.id);
    handleSocketDisconnect(socket.id, io);
    broadcastOnlineCounts(io);
  });
}
