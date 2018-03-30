/// <reference types="node" />
/// <reference types="ws" />
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as WebSocket from "ws";
import * as types from "./types";
import "colors";
export declare class Socket {
    private readonly connection;
    private readonly spoofedAddressAndPort;
    /** To store data contextually link to this socket */
    readonly misc: any;
    readonly evtResponse: SyncEvent<types.Response>;
    readonly evtRequest: SyncEvent<types.Request>;
    readonly evtClose: SyncEvent<boolean>;
    readonly evtConnect: VoidSyncEvent;
    readonly evtTimeout: VoidSyncEvent;
    /**Emit chunk of data as received by the underlying connection*/
    readonly evtData: SyncEvent<Buffer>;
    readonly evtDataOut: SyncEvent<Buffer>;
    /** Provided only so the error can be logged */
    readonly evtError: SyncEvent<Error>;
    readonly evtPacketPreWrite: SyncEvent<types.Packet>;
    private static readonly maxBytesHeaders;
    private static readonly maxContentLength;
    private static readonly connectionTimeout;
    private __localPort__;
    private __remotePort__;
    private __localAddress__;
    private __remoteAddress__;
    readonly localPort: number;
    readonly remotePort: number;
    readonly localAddress: string;
    readonly remoteAddress: string;
    haveBeedDestroyed: boolean;
    constructor(webSocket: WebSocket, addrAndPorts: Socket.AddrAndPorts);
    constructor(socket: net.Socket, spoofedAddrAndPorts?: Partial<Socket.AddrAndPorts>);
    readonly setKeepAlive: net.Socket['setKeepAlive'];
    /** Return true if sent successfully */
    write(sipPacket: types.Packet): boolean | Promise<boolean>;
    destroy(): void;
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
    function matchWebSocket(socket: net.Socket | WebSocket): socket is WebSocket;
}
