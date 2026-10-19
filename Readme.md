# Connect 4

[![Website](https://img.shields.io/website?url=https://connect-4-jade.vercel.app)](https://connect-4-jade.vercel.app)

## About

**Connect 4** is a classic two-player connection game where players take turns dropping colored discs into a grid. The objective is to connect four of one's own discs in a row, either horizontally, vertically, or diagonally.

## Features

- **Online multiplayer** in real time over WebSockets, with a 30-second turn timer, rematches, resign and in-game chat.
- **Play vs CPU** (easy / medium / hard minimax bot) and **pass & play** on one device.
- **Daily puzzle** (find the winning move, +50 XP), **4-player tournaments** and **live spectating**.
- **Friends** with live online status and one-click game invites.
- **Progression**: XP, levels, win/loss/draw stats, achievements, leaderboard and round history.
- Server-authoritative rules: the API validates every move and detects wins and draws, so clients can't cheat.
- Responsive design for phones and desktops, light and dark themes, keyboard-playable board.

## Technologies Used

- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Hosting**: Vercel (frontend), Render (backend)

## Run locally

```bash
cp .env.example .env   # then fill in the values
npm install
npm run dev            # http://localhost:3000
npm test               # board-rule unit tests
```

## Deploy to Render

1. New **Web Service** → connect this repo. Runtime: **Docker** (or Node with build `npm ci` and start `npm start`).
2. Environment variables: `MONGO_USER`, `MONGO_PASSWORD`, `TOKEN_SECRET`, and `FRONT_URL` set to your frontend URL
   (for example `https://connect-4-jade.vercel.app`; separate several with commas).
3. **Health check path**: `/health`.
4. MongoDB Atlas → Network Access: allow Render's outbound IPs (or `0.0.0.0/0`).
5. Pick the region closest to your players and your Atlas cluster (e.g. Frankfurt for Europe).
6. Free instances sleep after 15 idle minutes. To keep it awake, point a free uptime monitor
   (UptimeRobot, cron-job.org) at `https://<your-service>.onrender.com/health` every 10 minutes.

Then set `VITE_API_URL` in the frontend (Vercel) to the Render URL and redeploy it.

## How to Play

1. Start a new game.
2. Take turns dropping discs into the columns.
3. Try to connect four discs in a row before your opponent.
4. The game ends when a player connects four discs or the grid is full.

## Project Link

You can access the **Connect 4** application [here](https://connect-4-jade.vercel.app).

## GitHub Repositories

- **Frontend Repository**: [GitHub - Frontend](https://github.com/selimboulaaba/Connect_4_ReactJS)
- **Backend Repository**: [GitHub - Backend](https://github.com/selimboulaaba/Connect_4_ExpressJS)

