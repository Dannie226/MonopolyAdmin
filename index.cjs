const express = require("express");
const fs = require("fs");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});
const path = require("path");
const app = express();
const { SocketServerCommunicator, DataType } = require("./node_libs/SocketServerCommunicator.cjs");

const root = path.join(__dirname);

app.get("/", function(req, res){
    res.sendFile("./main.html", { root });
});
app.get("/style.css", function(req, res) {
    res.sendFile("./style.css", { root });
});

app.get("/main.js", function(req, res) {
    res.sendFile("./out/out.js", { root });
});

app.get("/resources/*", function(req, res) {
    res.sendFile("." + req.url, { root });
});

app.listen(8080, function() {
    console.log("Server Created. localhost:8080");
});


const internallyUsedNames = [ "center" ];
const communicator = new SocketServerCommunicator({ port: 4040 });

communicator.addListener(DataType.CONNECTION, function(data, socket) {
    socket.send(JSON.stringify(data));
});

communicator.addListener(DataType.INITIALIZATION, function(data, socket) {
    if(data.name in this.connections) {
        const errorDump = {
            dataType: DataType.ERROR,
            errorType: DataType.INITIALIZATION,
            subType: "nameTaken",
            message: data.name + " cannot be used by you. It has been taken by someone else."
        };

        socket.send(JSON.stringify(errorDump));
    } else if(data.name.toLowerCase() == "taken") {
        const errorDump = {
            dataType: DataType.ERROR,
            errorType: DataType.INITIALIZATION,
            subType: "nameIsTaken",
            message: "that name is " + data.name + "... I hate you."
        }

        socket.send(JSON.stringify(errorDump))
    } else if(data.name.toLowerCase() == "unavailable") {
        const errorDump = {
            dataType: DataType.ERROR,
            errorType: DataType.INITIALIZATION,
            subType: "nameIsUnavailable",
            message: "That name is " + data.name + ". You should know this. Nerd."
        }

        socket.send(JSON.stringify(errorDump));
    } else if(internallyUsedNames.includes(data.name.toLowerCase())) {
        const errorDump = {
            dataType: DataType.ERROR,
            errorType: DataType.INITIALIZATION,
            subType: "internalUsedName",
            message: "Your name cannot be " + data.name + ". It is used in something else, and that name would break things. So, no. Don't try to break my game."
        };

        socket.send(JSON.stringify(errorDump));
    } else {
        this.sendToAll(DataType.ADD, {
            name: data.name
        });
        this.sendToAll(DataType.EVERYONE_MESSAGE, {
            from: "Server",
            message: data.name + " has joined.",
            sending: false
        });

        console.log(`[Server]: ${data.name} has joined.`);

        const successDump = {
            dataType: DataType.CONNECTION_SUCCESS,
            name: data.name,
            names: Object.keys(this.connections)
        };

        socket.send(JSON.stringify(successDump));

        this.connections[data.name] = socket;
    }
});

communicator.addListener(DataType.EVERYONE_MESSAGE, function(data, socket) {
    socket.send(JSON.stringify(data));
    data.sending = false;

    const dataStr = JSON.stringify(data);
    for(const name in this.connections) {
        if(this.connections[name] != socket) {
            this.connections[name].send(dataStr);
        }
    }

    console.log(`[${data.from}]: ${data.message}`);
});

function readLine(message) {
    const emDump = {
        message,
        from: "Server",
        sending: false
    };

    communicator.sendToAll(DataType.EVERYONE_MESSAGE, emDump);

    readline.question("", readLine);
}

communicator.addListener(DataType.DIRECT_MESSAGE, function(data, socket) {
    if(this.connections[data.to] != undefined) {
        this.sendData(DataType.DIRECT_MESSAGE, data, data.from);
        data.sending = false;
        this.sendData(DataType.DIRECT_MESSAGE, data, data.to);
    } else {
        const errorDump = {
            errorType: DataType.DIRECT_MESSAGE,
            message: "userNotFound"
        };

        this.sendData(DataType.ERROR, errorDump, data.from);
    }
});

readline.question("", readLine);