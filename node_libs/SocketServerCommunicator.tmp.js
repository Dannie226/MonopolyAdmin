import { DataType } from "../tmp/ts/server/SocketCommunicator.js";

const { WebSocketServer } = require("ws");

class SocketServerCommunicator {
    serverSocket;
    connections;
    listeners;
    
    constructor(options) {
        this.serverSocket = new WebSocketServer(options);
        this.connections = {};
        this.listeners = [];

        const scope = this;

        this.serverSocket.on("connection", (ws) => {
            if(scope.listeners[DataType.CONNECTION] != undefined) {
                scope.listeners[DataType.CONNECTION].forEach(listener => {
                    listener.call(scope, {
                        dataType: DataType.CONNECTION,
                        message: "connected"
                    }, ws, scope);
                });
            }

            ws.on("close", () => {
                const removalDump = {};

                for(const name in scope.connections) {
                    if(scope.connections[name] == ws) {
                        removalDump.name = name;
                        delete scope.connections[name];
                        break;
                    }
                }

                console.log(`[Server]: ${removalDump.name} has left the game. Nerd.`);
                scope.sendToAll.call(scope, DataType.REMOVE, removalDump);
                scope.sendToAll.call(scope, DataType.EVERYONE_MESSAGE, {
                    from: "Server",
                    message: removalDump.name + " has left the game. Nerd.",
                    sending: false
                });
            });

            ws.on("message", (dataStr) => {
                const data = JSON.parse(dataStr);

                if(scope.listeners[data.dataType] == undefined)
                    return;

                scope.listeners[data.dataType].forEach(listener => {
                    listener.call(scope, data, ws, scope);
                });
            });
        });
    }

    sendData(dataType, data, to = data.to) {
        data.dataType = dataType;

        this.connections[to].send(JSON.stringify(data));
    }

    sendToAll(dataType, data) {
        data.dataType = dataType;

        const dataStr = JSON.stringify(data);

        for(const name in this.connections) {
            this.connections[name].send(dataStr);
        }
    }

    addListener(dataType, listener) {
        if(this.listeners[dataType] === undefined)
            this.listeners[dataType] = [];

        this.listeners[dataType].push(listener);
    }
};

export { SocketServerCommunicator, DataType };