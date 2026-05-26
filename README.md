# ClubMatch

Mobile-first local MVP for racquet sports club session matchmaking.

## Local Development

```bash
npm install
npm run dev
```

The prototype currently uses browser `localStorage` for player and session data. No database, auth, payment, booking, chat, or social feed is connected yet.

Open the local URL printed by Next.js, usually:

```bash
http://localhost:3000
```

For a fixed port:

```bash
npm run dev -- -p 3030
```

## Deploying to Vercel

1. Push this project to a Git repository.
2. In Vercel, choose **Add New Project** and import the repository.
3. Keep the default Next.js settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. Deploy.

No environment variables are required for the current localStorage-only prototype.

## Known Limitations

- Data is stored only in the current browser with `localStorage`.
- There is no cross-device sync yet.
- Clearing browser data will remove local prototype data.
- No database, auth, payment, booking, chat, or social feed is connected.
