const socket = io();
const boardEl = document.getElementById("board");
const playerSelect = document.getElementById("playerSelect");

let board = [];
let selections = {};
let mySelected = [];
let lockedPlayers = {}; // { [playerName]: true } jeśli gracz oddał już głos

const playerColors = {
    "Andzia": "rgba(255,0,0,0.4)",
    "Jerzy": "rgba(0,255,0,0.4)",
    "Rencia": "rgba(0,0,255,0.4)",
    "Szymon": "rgba(255,165,0,0.4)"
};

// Zmiana wybranego gracza – wczytaj jego dotychczasowy wybór (jeśli istnieje)
playerSelect.addEventListener("change", () => {
    const currentPlayer = playerSelect.value;
    const saved = selections[currentPlayer];

    // Jeśli gracz już oddał głos, pokazujemy tylko kropki (bez czerwonej ramki)
    if (lockedPlayers[currentPlayer]) {
        mySelected = [];
    } else {
        mySelected = Array.isArray(saved) ? [...saved] : [];
    }
    updateColors();
});

// Tworzy 9 pól
for (let i = 0; i < 9; i++) {
    const div = document.createElement("div");
    div.className = "cell";
    div.dataset.index = i;

    const textEl = document.createElement("div");
    textEl.className = "cell-text";
    div.appendChild(textEl);

    const votesEl = document.createElement("div");
    votesEl.className = "votes";
    div.appendChild(votesEl);

    // Kliknięcie - głosowanie na pole (max 3 pola)
    div.addEventListener("click", () => {
        const currentPlayer = playerSelect.value;
        if (lockedPlayers[currentPlayer]) {
            return; // ten gracz już oddał głos – brak dalszych zmian
        }
        if (mySelected.includes(i)) {
            mySelected = mySelected.filter(v => v !== i);
        } else {
            if (mySelected.length < 3) mySelected.push(i);
        }
        updateColors();
    });

    // Dwuklik - edycja tekstu pola (zmiana widoczna dla wszystkich graczy)
    div.addEventListener("dblclick", () => {
        const currentText = textEl.textContent || `Pole ${i + 1}`;
        const newText = prompt("Nowy tekst dla pola:", currentText);
        if (newText !== null && newText.trim() !== "") {
            socket.emit("editField", {
                index: i,
                text: newText.trim()
            });
        }
    });

    boardEl.appendChild(div);
}

function updateColors() {
    const cells = document.querySelectorAll(".cell");

    cells.forEach(c => {
        const votesContainer = c.querySelector(".votes");
        if (votesContainer) {
            votesContainer.innerHTML = "";
        }
        c.style.background = "#f2f2f2";
        c.classList.remove("selected");
    });

    // Kropki innych graczy
    Object.entries(selections).forEach(([player, fields]) => {
        fields.forEach(f => {
            const cell = document.querySelector(`[data-index="${f}"]`);
            if (!cell) return;
            const votesContainer = cell.querySelector(".votes");
            if (!votesContainer) return;

            const dot = document.createElement("span");
            dot.className = "vote-dot";
            dot.style.background = playerColors[player];
            votesContainer.appendChild(dot);
        });
    });

    // Moje zaznaczenia – obramowanie
    mySelected.forEach(f => {
        document.querySelector(`[data-index="${f}"]`).classList.add("selected");
    });
}

socket.on("boardState", (state) => {
    board = state.board;
    selections = state.selections;

    document.querySelectorAll(".cell").forEach((c, i) => {
        const textEl = c.querySelector(".cell-text");
        if (textEl) {
            textEl.textContent = board[i] || `Pole ${i+1}`;
        } else {
            c.textContent = board[i] || `Pole ${i+1}`;
        }
    });
    updateColors();
});

socket.on("selectionsUpdated", (data) => {
    selections = data;
    updateColors();
});

document.getElementById("sendSelection").onclick = () => {
    const currentPlayer = playerSelect.value;
    socket.emit("selectFields", {
        player: currentPlayer,
        fields: mySelected
    });
    // Po zapisaniu głosu ten gracz nie może już klikać w pola,
    // dopóki nie nastąpi reset jego wyboru lub reset wszystkich.
    lockedPlayers[currentPlayer] = true;
    // Po zapisaniu nie podkreślamy już na czerwono wyboru tego gracza
    mySelected = [];
    updateColors();
};

document.getElementById("resetMe").onclick = () => {
    mySelected = [];
    const currentPlayer = playerSelect.value;
    socket.emit("resetPlayer", currentPlayer);
    lockedPlayers[currentPlayer] = false;
};

document.getElementById("resetAll").onclick = () => {
    mySelected = [];
    socket.emit("resetAll");
    lockedPlayers = {};
};
