import { SocketCommunicator, DataType } from "./server/SocketCommunicator";
import { Chatter } from "./ui/Chatter"
import { Settings } from "./ui/Settings";
import { MonopolyGame } from "./game/MonopolyGame"
import { Assets } from "./game/Assets";
import { MoveBoard } from "./ui/MoveBoard";

async function main() {
    const loginScreen = document.getElementById("login");
    const gameScreen = document.getElementById("game");

    const settings = new Settings();
    const socketCommunicator = new SocketCommunicator("ws://10.42.217.126:4040/");

    socketCommunicator.addListener(DataType.CONNECTION, (data) => {
        loginScreen.style.display = "block";
    });

    const usernameInput = document.getElementById("username") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;
    const errorElement = document.getElementById("error");

    usernameInput.addEventListener("keydown", function(ev) {
        if(ev.key == "Enter") {
            socketCommunicator.sendData(DataType.INITIALIZATION, {
                name: usernameInput.value
            });
        } else {
            errorElement.style.display = "none";
        }
    });

    socketCommunicator.addListener(DataType.ERROR, (data) => {
        if(data.errorType == DataType.INITIALIZATION) {
            errorElement.innerText = data.message;
            errorElement.style.display = "inline";
        }
    });

    let chatter: Chatter;
    let moveBoard: MoveBoard;
    let game: MonopolyGame;
    Assets.init();

    socketCommunicator.addListener(DataType.CONNECTION_SUCCESS, async (data) => {
        loginScreen.style.display = "none";
        gameScreen.style.display = "block";

        chatter = new Chatter(socketCommunicator, settings, data.name, data.names);
        moveBoard = new MoveBoard(settings);
        game = new MonopolyGame();

        await game.init(settings);
    });
}

window.onload = main;