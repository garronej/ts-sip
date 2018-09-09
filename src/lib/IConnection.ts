
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as types from "./types";

/** 
 * Wrapper aiming to provide a unique API to manipulate net.Socket tls.Socket and
 * WebSocket
 */
export interface IConnection {

    localPort: number;
    remotePort: number;
    localAddress: string;
    remoteAddress: string;

    emit(evtName: "error", error: Error): void;
    emit(evtName: "close", had_error: boolean): void;

    once(evtName: "error", handler: (error: Error) => void): this;
    once(evtName: "close", handler: (had_error: boolean) => void): this;
    once(evtName: "connect", handler: () => void): this;

    on(eventName: "data", handler: (data: types.IBuffer) => void): this;

    isConnecting(): boolean;

    destroy(): void;

    /** return isSent */
    write(data: types.IBuffer, callback: (isSent: boolean) => void): void;

    readonly protocol: types.TransportProtocol;

}

export type AddrAndPorts = {
    localPort: number;
    remotePort: number;
    localAddress: string;
    remoteAddress: string;
};

/** Implementation for net.Socket and tls.Socket */
export class NetSocketConnection implements IConnection {

    public readonly protocol: "TLS" | "TCP";

    public localPort = NaN;
    public remotePort = NaN;
    public localAddress = "";
    public remoteAddress = "";

    private readonly netSocket: import("net").Socket;

    constructor(netSocket: any) {

        this.netSocket = netSocket;

        this.netSocket.setMaxListeners(Infinity);

        const setAddrAndPort = () => {

            this.localPort = this.netSocket.localPort;

            if (this.netSocket.remotePort !== undefined) {
                this.remotePort = this.netSocket.remotePort;
            }

            this.localAddress = this.netSocket.localAddress;

            if (!!this.netSocket.remoteAddress) {
                this.remoteAddress = this.netSocket.remoteAddress;
            }

        };

        setAddrAndPort();

        let connectEvtName: "secureConnect" | "connect";

        if (this.netSocket["encrypted"]) {

            this.protocol = "TLS";

            connectEvtName = "secureConnect";

        } else {

            this.protocol = "TCP";

            connectEvtName = "connect";
        }

        this.netSocket.once(
            connectEvtName,
            () => setAddrAndPort()
        );

    }

    public emit(evtName: "error", error: Error): void;
    public emit(evtName: "close", had_error: boolean): void;
    public emit(
        evtName: "error" | "close",
        evtData: any
    ): void {

        this.netSocket.emit(evtName, evtData);

    };

    public once(evtName: "error", handler: (error: Error) => void): this;
    public once(evtName: "close", handler: (had_error: boolean) => void): this;
    public once(evtName: "connect", handler: () => void): this;
    public once(evtName: "error" | "close" | "connect", handler: any): this {

        this.netSocket.once(evtName, handler);

        return this;

    }

    public on(_evtName: "data", handler: (data: types.IBuffer) => void): this {

        this.netSocket.on("data", handler);

        return this;

    }

    public isConnecting(): boolean {

        return this.netSocket.connecting;

    }

    public destroy(): void {

        this.netSocket.destroy();

    }

    public write(data: types.IBuffer, callback: (isSent: boolean) => void): void {

        const isFlushed = this.netSocket.write(data);

        if (isFlushed) {

            callback(true);

        } else {

            let onceClose: () => void;
            let onceDrain: () => void;

            Promise.race([
                new Promise<false>(
                    resolve => this.netSocket.once("close", onceClose = () => resolve(false))
                ),
                new Promise<true>(
                    resolve => this.netSocket.once("drain", onceDrain = () => resolve(true))
                )
            ]).then(isSent => {

                this.netSocket.removeListener("close", onceClose);
                this.netSocket.removeListener("drain", onceDrain);

                callback(isSent);

            });


        }


    }

}

/** Implementation for WebSocket */
export class WebSocketConnection implements IConnection {

    public readonly protocol: "WSS" = "WSS";

    public readonly localPort: number = NaN;
    public readonly remotePort: number = NaN;
    public readonly localAddress: string = "_unknown_local_address_";
    public readonly remoteAddress: string = "_unknown_remote_address_";

    private readonly evtMessageEvent = new SyncEvent<MessageEvent>();
    private readonly evtError = new SyncEvent<Error>();
    private readonly evtClose = new SyncEvent<boolean>();
    private readonly evtConnect = new VoidSyncEvent();

    private readonly websocket: WebSocket | import("ws");

    constructor(websocket: any) {

        this.websocket = websocket;

        this.websocket.onmessage = messageEvent =>
            this.evtMessageEvent.post(messageEvent)
            ;

        this.websocket.onerror = () => {
            websocket.onerror = () => { };
            this.evtError.post(new Error("Native Websocket Error"));
        };

        this.websocket.onclose = () => {
            websocket.onclose = () => { };
            this.evtClose.post(this.evtError.postCount !== 0);
        };

        if (this.isConnecting()) {

            this.websocket.onopen = () => this.evtConnect.post();

        }

    }

    public emit(evtName: "error", error: Error): void;
    public emit(evtName: "close", had_error: boolean): void;
    public emit(evtName: "error" | "close", evtData: any): void {

        switch (evtName) {
            case "error":
                ((error: Error) => {

                    this.evtError.post(error);

                })(evtData);
                break;
            case "close":
                ((had_error: boolean) => {

                    this.evtClose.post(had_error);

                })(evtData);
                break;
        }

    };

    public once(evtName: "error", handler: (error: Error) => void): this;
    public once(evtName: "close", handler: (had_error: boolean) => void): this;
    public once(evtName: "connect", handler: () => void): this;
    public once(evtName: "error" | "close" | "connect", handler: any): this {

        switch (evtName) {
            case "error":
                ((handler: (error: Error) => void) => {

                    this.evtError.attachOnce(error => handler(error));

                })(handler);
                break;
            case "close":
                ((handler: (had_error: boolean) => void) => {

                    this.evtClose.attachOnce(had_error => handler(had_error));

                })(handler);
                break;
            case "connect":
                ((handler: () => void) => {

                    this.evtConnect.attachOnce(() => handler());

                })(handler);
                break;
        }

        return this;

    }


    public on(_evtName: "data", handler: (data: types.IBuffer) => void): this {

        this.evtMessageEvent.attach(messageEvent =>
            handler(Buffer.from(messageEvent.data))
        );

        return this;

    }

    public isConnecting(): boolean {

        return this.websocket.readyState === this.websocket.CONNECTING;

    }

    public destroy(): void {

        this.evtMessageEvent.detach();

        this.websocket.close();

    }

    public write(data: types.IBuffer, callback: (isSent: boolean) => void): void {

        try {

            const dataAsString = data.toString("utf8");

            //This should not have to be casted :(
            (this.websocket as any).send(dataAsString);


        } catch {

            callback(false);

        }

        callback(true);

    }

}
