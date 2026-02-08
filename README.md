# phaser-bomberman

This is pixel perfect (+-, but I tried to do it) copy of Bomberman II game written on Phaser.js.

## Controls

- Move character — Arrow keys
- Place a bomb — Space or A key
- Gamepad supported (e.g. Dualshock 4 via USB)

## Development

Start both the webpack dev server and the game server:

```bash
npm install
npm start          # frontend dev server on http://localhost:8080
npm run server     # game/WebSocket server on http://localhost:3000
```

Open http://localhost:8080 in your browser. Both servers must be running for multiplayer to work.

## Production

Build the client bundle and start the server:

```bash
npm run build      # outputs to dist/
npm run server     # serves dist/ and handles WebSocket on port 3000
```

Open http://localhost:3000 in your browser.

To use a custom port:

```bash
PORT=80 npm run server
```

![Screen Shot 2020-07-31 at 5 32 38 PM](https://user-images.githubusercontent.com/109203/89026987-dce59080-d353-11ea-8ca5-9e92926ae623.png)
