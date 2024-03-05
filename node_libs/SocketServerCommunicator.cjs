'use strict';

exports.DataType = void 0;
(function (DataType) {
    DataType[DataType["CONNECTION"] = 0] = "CONNECTION";
    DataType[DataType["CONNECTION_SUCCESS"] = 1] = "CONNECTION_SUCCESS";
    DataType[DataType["INITIALIZATION"] = 2] = "INITIALIZATION";
    DataType[DataType["ADD"] = 3] = "ADD";
    DataType[DataType["REMOVE"] = 4] = "REMOVE";
    DataType[DataType["DIRECT_MESSAGE"] = 5] = "DIRECT_MESSAGE";
    DataType[DataType["EVERYONE_MESSAGE"] = 6] = "EVERYONE_MESSAGE";
    DataType[DataType["START_GAME"] = 7] = "START_GAME";
    DataType[DataType["ERROR"] = 8] = "ERROR";
})(exports.DataType || (exports.DataType = {}));

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
            if(scope.listeners[exports.DataType.CONNECTION] != undefined) {
                scope.listeners[exports.DataType.CONNECTION].forEach(listener => {
                    listener.call(scope, {
                        dataType: exports.DataType.CONNECTION,
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
                scope.sendToAll.call(scope, exports.DataType.REMOVE, removalDump);
                scope.sendToAll.call(scope, exports.DataType.EVERYONE_MESSAGE, {
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
}

exports.SocketServerCommunicator = SocketServerCommunicator;
