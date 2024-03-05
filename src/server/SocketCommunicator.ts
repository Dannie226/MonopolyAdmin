enum DataType {
    CONNECTION = 0,
    CONNECTION_SUCCESS = 1,
    INITIALIZATION = 2,
    ADD = 3,
    REMOVE = 4,
    DIRECT_MESSAGE = 5,
    EVERYONE_MESSAGE = 6,
    START_GAME = 7,
    ERROR = 8
}

interface ConnectionData {
    dataType?: DataType.CONNECTION,
    message: string
}

interface ConnectionSuccessData {
    dataType?: DataType.CONNECTION_SUCCESS,
    name: string,
    names: string[]
}

interface AddData {
    dataType?: DataType.ADD,
    name: string
}

interface RemoveData {
    dataType?: DataType.REMOVE,
    name: string
}

interface DMData {
    dataType?: DataType.DIRECT_MESSAGE,
    from: string,
    to: string,
    message: string,
    sending: boolean
}

interface EMData {
    dataType?: DataType.EVERYONE_MESSAGE,
    from: string,
    message: string,
    sending: boolean
}

interface ErrorData {
    dataType?: DataType.ERROR,
    errorType: DataType,
    subType: string,
    message: string
}

interface InitializationData {
    dataType?: DataType.INITIALIZATION,
    name: string
}

interface StartGameData {
    dataType?: DataType.START_GAME,
    order: string[];
}

type Data = ConnectionData | ConnectionSuccessData | AddData | RemoveData | DMData | EMData | ErrorData | InitializationData | StartGameData;

type Listener<D extends Data> = (obj: D) => void;

class SocketCommunicator {
    private socket: WebSocket;
    private listeners: Listener<Data>[][];

    public constructor(url: string) {
        this.socket = new WebSocket(url);

        this.socket.addEventListener("message", (ev) => {
            const dump = JSON.parse(ev.data) as Data;
            if(this.listeners[dump.dataType] == undefined)
                return;
            this.listeners[dump.dataType].forEach(element => {
                element.call(null, dump);
            });
        });

        this.listeners = [];
    }

    public sendData(type: DataType.CONNECTION, data: ConnectionData): void;
    public sendData(type: DataType.CONNECTION_SUCCESS, data: ConnectionSuccessData): void;
    public sendData(type: DataType.ADD, data: AddData): void;
    public sendData(type: DataType.REMOVE, data: RemoveData): void;
    public sendData(type: DataType.DIRECT_MESSAGE, data: DMData): void;
    public sendData(type: DataType.EVERYONE_MESSAGE, data: EMData): void;
    public sendData(type: DataType.ERROR, data: ErrorData): void;
    public sendData(type: DataType.INITIALIZATION, data: InitializationData): void;
    public sendData(type: DataType.START_GAME, data: StartGameData): void;
    public sendData(type: DataType, data: Data): void {
        data.dataType = type;
        this.socket.send(JSON.stringify(data));
    }

    public addListener(type: DataType.CONNECTION, callback: Listener<ConnectionData>): void;
    public addListener(type: DataType.CONNECTION_SUCCESS, callback: Listener<ConnectionSuccessData>): void;
    public addListener(type: DataType.ADD, callback: Listener<AddData>): void;
    public addListener(type: DataType.REMOVE, callback: Listener<RemoveData>): void;
    public addListener(type: DataType.DIRECT_MESSAGE, callback: Listener<DMData>): void;
    public addListener(type: DataType.EVERYONE_MESSAGE, callback: Listener<EMData>): void;
    public addListener(type: DataType.ERROR, callback: Listener<ErrorData>): void;
    public addListener(type: DataType.INITIALIZATION, callback: Listener<InitializationData>): void;
    public addListener(type: DataType.START_GAME, callback: Listener<StartGameData>): void;
    public addListener(type: DataType, callback: Listener<any>): void {
        if(this.listeners[type] == undefined)
            this.listeners[type] = [];
        this.listeners[type].push(callback);
    }

    public removeListener(type: DataType.CONNECTION, callback: Listener<ConnectionData>): void;
    public removeListener(type: DataType.CONNECTION_SUCCESS, callback: Listener<ConnectionSuccessData>): void;
    public removeListener(type: DataType.ADD, callback: Listener<AddData>): void;
    public removeListener(type: DataType.REMOVE, callback: Listener<RemoveData>): void;
    public removeListener(type: DataType.DIRECT_MESSAGE, callback: Listener<DMData>): void;
    public removeListener(type: DataType.EVERYONE_MESSAGE, callback: Listener<EMData>): void;
    public removeListener(type: DataType.ERROR, callback: Listener<ErrorData>): void;
    public removeListener(type: DataType.INITIALIZATION, callback: Listener<InitializationData>): void;
    public removeListener(type: DataType.START_GAME, callback: Listener<StartGameData>): void;
    public removeListener(type: DataType, callback: Listener<any>): void {
        let i = this.listeners[type].indexOf(callback);

        if(i != -1) {
            this.listeners[type].splice(i, 1);
        }
    }

    public async awaitData(type: DataType.CONNECTION) : Promise<ConnectionData>;
    public async awaitData(type: DataType.CONNECTION_SUCCESS) : Promise<ConnectionSuccessData>;
    public async awaitData(type: DataType.ADD) : Promise<AddData>;
    public async awaitData(type: DataType.REMOVE) : Promise<RemoveData>;
    public async awaitData(type: DataType.DIRECT_MESSAGE) : Promise<DMData>;
    public async awaitData(type: DataType.EVERYONE_MESSAGE) : Promise<EMData>;
    public async awaitData(type: DataType.ERROR) : Promise<ErrorData>;
    public async awaitData(type: DataType.INITIALIZATION) : Promise<InitializationData>;
    public async awaitData(type: DataType.START_GAME) : Promise<StartGameData>;
    public awaitData(type: DataType): Promise<Data> {
        const scope = this;
        return new Promise((resolve) => {
            scope.addListener(type as DataType.START_GAME, function e(data) {
                scope.removeListener(type as DataType.START_GAME, e);
                resolve(data);
            });
        });
    }
}

export { SocketCommunicator, DataType };