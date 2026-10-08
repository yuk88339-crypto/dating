# NearChat 📍

> Omegle-style random video & text chat platform matching strangers **exclusively within a 30 km radius**.

NearChat brings the excitement of random video and text chatting to your local area. Unlike global chat platforms, NearChat enforces a strict geographic constraint: you are only ever paired with someone who is within **30 kilometers** of your current location.

---

## 🌟 Key Features

1. **Strict 30 km Geographic Boundary**
   - Matching is calculated on the server using the **Haversine great-circle formula**.
   - If no one is waiting within 30 km, the user continues searching. The platform **never** falls back to matching anyone beyond 30 km.
2. **Privacy First (No Raw GPS Sharing)**
   - Exact coordinates are kept strictly in server memory during matching and are **never** stored in the database or sent to peers.
   - Partners only see a privacy-friendly rounded distance range (e.g., `< 2 km`, `~5 km`, `5-10 km`, `10-20 km`, `20-30 km`).
3. **High-Performance In-Memory Queue**
   - Active queue is kept in server memory (`Map`) for sub-millisecond distance scans and instant pairing.
   - Matching re-runs every 3 seconds for all waiting users.
4. **Peer-to-Peer WebRTC Video**
   - Video and audio stream directly between browsers via WebRTC with public STUN servers and configurable TURN server credentials.
   - Camera and microphone toggles, audio mute, and picture-in-picture local preview.
5. **Community Safety & Moderation**
   - 18+ age gate and Terms of Service consent required before entry.
   - **One-Way Hashed IP Tracking**: IP addresses are hashed using SHA-256 with a secret salt. Raw IPs are never logged or stored.
   - **Automated 24-Hour Ban**: If a user accumulates 3 community reports (nudity, harassment, spam, abuse), their hashed IP is automatically suspended for 24 hours.
   - **Session Blocking**: Blocked strangers are excluded from ever matching with you again for that session.
   - **Server-Side Profanity Filter & XSS Sanitization**: Inappropriate words are censored and HTML injection is neutralized.
   - **Rate Limiting**: Cooldown of 2 seconds on "Next" match, max 5 messages per 3 seconds, and 500-character limit.
6. **Live Proximity Counter**
   - Real-time `online_count` showing how many active users are currently online within your specific 30 km radius.

---

## 📁 Project Structure

```
├── /server                     # Backend server code
│   ├── config.js               # MAX_RADIUS_KM (30), PORT, STUN/TURN, rate limits
│   ├── index.js                # Standalone Express + Socket.io + Mongoose server
│   ├── middleware/
│   │   └── rateLimit.js        # Socket rate limiting, IP hashing, bad-word filter, sanitization
│   ├── models/
│   │   ├── Ban.js              # Mongoose schema + in-memory fallback for 24h bans
│   │   └── Report.js           # Mongoose schema + in-memory fallback for user reports
│   ├── socket/
│   │   ├── matchmaking.js      # In-memory queue, Haversine scan, 30 km pairing, room management
│   │   └── signaling.js        # WebRTC signaling (offer/answer/ICE), chat messages, typing, reports
│   ├── utils/
│   │   └── haversine.js        # Haversine distance algorithm & rounded range obfuscation
│   └── .env.example            # Backend environment variables template
│
├── /client                     # Frontend React code
│   ├── components/
│   │   ├── Chat.tsx            # Main chat session container
│   │   ├── Landing.tsx         # 18+ gate, mode selector, location request, dev coordinates
│   │   ├── MessageInput.tsx    # Message bar with 500-char limit, Next cooldown, Stop
│   │   ├── MessageList.tsx     # Message bubbles, typing indicator, auto-scroll
│   │   ├── ReportModal.tsx     # Report reasons modal with 3-report threshold notice
│   │   ├── SearchingScreen.tsx # Sonar radar animation & nearby user counter
│   │   ├── TopBar.tsx          # Status, rounded distance badge, online count, block/report
│   │   └── VideoPanel.tsx      # Remote video, picture-in-picture local video, mic/camera toggles
│   ├── hooks/
│   │   ├── useLocation.ts      # Geolocation API handling and 2-tab testing coordinate presets
│   │   ├── useMatchmaking.ts   # Queue state, chat messaging, typing, block, report
│   │   ├── useSocket.ts        # Socket.io connection lifecycle & auto-reconnect
│   │   └── useWebRTC.ts        # RTCPeerConnection, STUN/TURN, media track management
│   └── .env.example            # Frontend environment variables template
│
├── server.ts                   # Unified full-stack dev & production server (port 3000)
├── index.html                  # HTML entry point with NearChat metadata
├── package.json                # Dependencies and npm scripts
└── README.md                   # Complete documentation
```

---

## 🧠 Matching & Signaling Architecture

### 1. Matching Algorithm (`server/socket/matchmaking.js`)

```
1. Client joins queue with { lat, lng, mode: 'text' | 'video' }
2. Server validates lat (-90 to +90) and lng (-180 to +180)
3. Scan other users in waitingQueue:
   a. Check mode === client.mode
   b. Check client is not blocked by peer AND peer is not blocked by client
   c. Compute Haversine distance:
      d = 2 * R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlon/2)))
   d. Condition: d <= MAX_RADIUS_KM (30 km)
4. If one or more candidates qualify:
   - Select the candidate with the smallest distance
   - Remove both from waitingQueue
   - Generate unique roomId
   - User 1 is designated initiator: true (creates WebRTC offer)
   - User 2 is initiator: false (waits for offer)
   - Emit 'matched' with rounded distance range (e.g. "~5 km"), NEVER raw coordinates
5. If no candidate qualifies:
   - Emit 'searching'
   - Keep in waitingQueue
   - Background interval scans the queue every 3 seconds
```

### 2. WebRTC Signaling Flow (`server/socket/signaling.js`)

```
Peer A (Initiator)                    Server                     Peer B (Receiver)
       |                                |                               |
       |----- webrtc_offer (SDP) ------>|                               |
       |                                |----- webrtc_offer (SDP) ----->|
       |                                |                               |
       |                                |<---- webrtc_answer (SDP) -----|
       |<---- webrtc_answer (SDP) ------|                               |
       |                                |                               |
       |----- webrtc_ice (candidate) -->|                               |
       |                                |----- webrtc_ice (candidate) ->|
       |                                |<---- webrtc_ice (candidate) --|
       |<---- webrtc_ice (candidate) ---|                               |
       |                                                                |
       |================ P2P Video/Audio Media Stream ==================|
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Full-Stack App
```bash
npm run dev
```
The application starts at `http://localhost:3000`. Express, Socket.io, and Vite dev server run together on port 3000.

---

## 🧪 How to Test with 2 Browser Tabs

To simulate and test real matching between two users:

1. Open **Tab 1** at `http://localhost:3000`.
   - Check the **18+ confirmation** and **Terms of Service** checkboxes.
   - Choose **Text Chat** or **Video Chat**.
   - Under *Location Status*, you can click **"2-Tab Test Locations"** and pick **"City Center (Tab 1)"** (or allow browser location).
   - Click **Start Text Chat** (or Video Chat). Tab 1 enters the radar searching state.

2. Open **Tab 2** (either a new tab or an Incognito window) at `http://localhost:3000`.
   - Check the **18+ confirmation** and **Terms of Service** checkboxes.
   - Select the same chat mode (Text or Video).
   - Under *Location Status*, click **"2-Tab Test Locations"** and pick **"Nearby Suburb (Tab 2 - 8 km away)"**.
   - Click **Start Text Chat** (or Video Chat).

3. **Verify Proximity Matching**:
   - Both tabs are matched instantly!
   - Tab 1 and Tab 2 show: `Stranger ~5 km` or `5-10 km` away.
   - Send messages: observe real-time delivery and the `Stranger is typing...` indicator.
   - Click **Next**: Tab 1 returns to queue, while Tab 2 receives `Stranger has left the conversation`.

4. **Verify Boundary Enforcement**:
   - Open a third tab and select **"Another City (Tab 3 - 150 km away)"**.
   - Start chatting. Notice that Tab 3 remains on the searching screen and is **never** matched with Tab 1 or Tab 2 because 150 km > 30 km!

---

## 🌐 Production Deployment

### Option A: Full-Stack Deployment (Render / Railway / Cloud Run)

Since NearChat includes an integrated Express + Socket.io server that serves the production Vite bundle:

1. Set environment variables on your host:
   ```env
   NODE_ENV=production
   PORT=3000
   MAX_RADIUS_KM=30
   CLIENT_ORIGIN="*"
   IP_SALT="your-cryptographic-salt"
   MONGO_URI="mongodb+srv://user:password@cluster.mongodb.net/nearchat"
   ```
2. Build command:
   ```bash
   npm run build
   ```
3. Start command:
   ```bash
   npm start
   ```

### Option B: Separate Backend and Frontend

#### 1. Backend on Render / Railway (`/server`)
- Root directory: `.`
- Start command: `node server/index.js`
- Environment variables:
  - `PORT`: `5000` (or provided by host)
  - `MAX_RADIUS_KM`: `30`
  - `CLIENT_ORIGIN`: `https://your-frontend-app.vercel.app`
  - `MONGO_URI`: `mongodb+srv://...`
  - `TURN_SERVER`, `TURN_USERNAME`, `TURN_CREDENTIAL` (optional for symmetric NATs)

#### 2. Frontend on Vercel / Netlify (`/client`)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_SOCKET_URL`: `https://your-server-app.onrender.com`

---

## 🛡️ Moderation & Privacy Compliance

- **No User Accounts**: No emails, passwords, phone numbers, or profile photos are stored.
- **Ephemeral GPS**: Latitude and longitude exist in memory solely to compute distance via Haversine and are never persisted to disk or database.
- **24-Hour Hashed IP Bans**:
  ```javascript
  const ipHash = crypto.createHash('sha256').update(rawIp + IP_SALT).digest('hex');
  ```
  If an IP hash receives 3 reports within a 24-hour period, access is rejected on connection with the remaining suspension time.
- **Text Safety**: Client input is capped at 500 characters, HTML tags are escaped, and offensive profanities are censored server-side.

---

## 📄 License
Apache-2.0
