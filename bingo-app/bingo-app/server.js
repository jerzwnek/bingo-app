const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let board = Array(9).fill(null);      // 3x3 pola
let selections = {};                 // zaznaczenia graczy {playerName: [id, id, id]}

io.on("connection", (socket) => {
    console.log("Użytkownik połączony:", socket.id);

    // Po połączeniu nowy klient dostaje aktualny stan gry
    socket.emit("boardState", { board, selections });

    // Gracz wybiera 3 pola
    socket.on("selectFields", ({ player, fields }) => {
        selections[player] = fields;   // zapisz wybór
        io.emit("selectionsUpdated", selections); // rozgłoś do wszystkich
    });

    // Reset jednego gracza
    socket.on("resetPlayer", (player) => {
        selections[player] = [];
        io.emit("selectionsUpdated", selections);
    });

    // Reset wszystkich
    socket.on("resetAll", () => {
        selections = {};
        io.emit("selectionsUpdated", selections);
    });

    // Edycja tekstów pól
    socket.on("editField", ({ index, text }) => {
        board[index] = text;
        io.emit("boardState", { board, selections });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
