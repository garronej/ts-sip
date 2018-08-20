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
export declare type AddrAndPorts = {
    localPort: number;
    remotePort: number;
    localAddress: string;
    remoteAddress: string;
};
/** Implementation for net.Socket and tls.Socket */
export declare class NetSocketConnection implements IConnection {
    readonly protocol: "TLS" | "TCP";
    localPort: number;
    remotePort: number;
    localAddress: string;
    remoteAddress: string;
    private readonly netSocket;
    constructor(netSocket: any);
    emit(evtName: "error", error: Error): void;
    emit(evtName: "close", had_error: boolean): void;
    once(evtName: "error", handler: (error: Error) => void): this;
    once(evtName: "close", handler: (had_error: boolean) => void): this;
    once(evtName: "connect", handler: () => void): this;
    on(_evtName: "data", handler: (data: types.IBuffer) => void): this;
    isConnecting(): boolean;
    destroy(): void;
    write(data: types.IBuffer, callback: (isSent: boolean) => void): void;
}
/** Implementation for WebSocket */
export declare class WebSocketConnection implements IConnection {
    readonly protocol: "WSS";
    readonly localPort: number;
    readonly remotePort: number;
    readonly localAddress: string;
    readonly remoteAddress: string;
    private readonly evtMessageEvent;
    private readonly evtError;
    private readonly evtClose;
    private readonly evtConnect;
    private readonly websocket;
    constructor(websocket: any);
    emit(evtName: "error", error: Error): void;
    emit(evtName: "close", had_error: boolean): void;
    once(evtName: "error", handler: (error: Error) => void): this;
    once(evtName: "close", handler: (had_error: boolean) => void): this;
    once(evtName: "connect", handler: () => void): this;
    on(_evtName: "data", handler: (data: types.IBuffer) => void): this;
    isConnecting(): boolean;
    destroy(): void;
    write(data: types.IBuffer, callback: (isSent: boolean) => void): void;
}
