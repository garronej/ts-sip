/// <reference types="node" />
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as types from "./types";
import "colors";
/**
 * This is just a phony interface so we do not have to include @types/ws
 * as production dependency.
 *
 * To see the real def:
 *
 * import * as WebSocket from "ws";
 *
 * **/
export interface IWebSocket {
    emit: any;
    on: any;
    once: any;
    terminate(): void;
    send(data: any, cb?: (err: Error) => void): void;
    send(data: any, options: {
        mask?: boolean;
        binary?: boolean;
        compress?: boolean;
        fin?: boolean;
    }, cb?: (err: Error) => void): void;
}
export declare class Socket {
    private readonly connection;
    private readonly spoofedAddressAndPort;
    /** To store data contextually link to this socket */
    readonly misc: any;
    /**
     *
     * Post has_error.
     *
     * Posted synchronously ( with false ) when destroy is called,
     * OR
     * ( with true ) when evtError is posted
     * OR
     * ( with false ) when underlying socket post "close"
     *
     */
    readonly evtClose: SyncEvent<boolean>;
    /**
     * Posted when underlying socket connect,
     * If underlying socket was already connected when
     * when constructed posted synchronously when instantiated.
     *
     *  */
    readonly evtConnect: VoidSyncEvent;
    /** API traffic is extracted, won't be posted here */
    readonly evtResponse: SyncEvent<types.Response>;
    readonly evtRequest: SyncEvent<types.Request>;
    /** Post chunk of data as received by the underlying connection*/
    readonly evtData: SyncEvent<Buffer>;
    /** Post chunk of data as wrote on underlying socket (once write return true )*/
    readonly evtDataOut: SyncEvent<Buffer>;
    /** Chance to modify packet before it is serialized */
    readonly evtPacketPreWrite: SyncEvent<types.Packet>;
    /**
     * Provided only so the error can be logged.
     *
     * Posted when underlying socket emit "error" event
     * OR
     * When the socket is flooded
     * OR
     * When the stream parser throw an Error ( possible ? )
     * OR
     * Socket took to much time to connect.
     *
     *
     * */
    readonly evtError: SyncEvent<Error>;
    static readonly maxBytesHeaders: number;
    static readonly maxContentLength: number;
    static readonly connectionTimeout: number;
    private __localPort__;
    private __remotePort__;
    private __localAddress__;
    private __remoteAddress__;
    readonly localPort: number;
    readonly remotePort: number;
    readonly localAddress: string;
    readonly remoteAddress: string;
    constructor(webSocket: IWebSocket, addrAndPorts: Socket.AddrAndPorts);
    constructor(socket: net.Socket, spoofedAddrAndPorts?: Partial<Socket.AddrAndPorts>);
    readonly setKeepAlive: net.Socket['setKeepAlive'];
    /**
     * Return true if sent successfully
     * If socket had not connected yet throw error.
     * WARNING: If socket has closed will never resolve!
     * */
    write(sipPacket: types.Packet): boolean | Promise<boolean>;
    /** Readonly, true if destroy have been called ( not called internally ) */
    haveBeedDestroyed: boolean;
    /** Readonly, message provide when and if destroy have been called */
    destroyReason: string | undefined;
    /**
     * Destroy underlying connection, evtClose is posted synchronously.
     * No more traffic will occur on the socket.
     * */
    destroy(reason?: string): void;
    readonly protocol: "TCP" | "TLS" | "WSS";
    /** Return a clone of the packet ready for next hop */
    buildNextHopPacket(sipRequest: types.Request): types.Request;
    buildNextHopPacket(sipResponse: types.Response): types.Response;
    buildNextHopPacket(sipPacket: types.Packet): types.Packet;
    private loggerEvt;
    enableLogger(params: {
        socketId: string;
        localEndId: string;
        remoteEndId: string;
        incomingTraffic?: boolean;
        outgoingTraffic?: boolean;
        error?: boolean;
        connection?: boolean;
        close?: boolean;
        colorizedTraffic?: "OUT" | "IN";
        ignoreApiTraffic?: boolean;
    }, log?: typeof console.log): void;
}
export declare namespace Socket {
    type AddrAndPorts = {
        localPort: number;
        remotePort: number;
        localAddress: string;
        remoteAddress: string;
    };
    function matchWebSocket(socket: net.Socket | IWebSocket): socket is IWebSocket;
}
