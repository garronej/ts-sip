import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as types from "./types";
import { AddrAndPorts } from "./IConnection";
import "colors";
export declare class Socket {
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
    readonly evtData: SyncEvent<types.IBuffer>;
    /** Post chunk of data as wrote on underlying socket (once write return true )*/
    readonly evtDataOut: SyncEvent<types.IBuffer>;
    /** Chance to modify packet before it is serialized */
    readonly evtPacketPreWrite: SyncEvent<types.Packet>;
    /**
     * Provided only so the error can be logged.
     *
     * Posted when underlying socket emit "error" event
     * OR
     * When the socket is flooded
     * OR
     * When the stream parser throw an Error ( possible ? YES! )
     * OR
     * Socket took to much time to connect.
     *
     *
     * */
    readonly evtError: SyncEvent<Error>;
    static readonly maxBytesHeaders: number;
    static readonly maxContentLength: number;
    static readonly connectionTimeout: number;
    readonly localPort: number;
    readonly remotePort: number;
    readonly localAddress: string;
    readonly remoteAddress: string;
    private readonly connection;
    private openTimer;
    /**
     * @param socket net.Socket ( include tls.TLSSocket ) or an instance of an object that implement
     * the HTML5's websocket interface. ( in node use 'ws' module ).
     * The type of this param is not exposed because WebSocket as defined in the dom is not present
     * in a node environment and the modules "net" "tls" and "ws" should not have types definition
     * in a web environment.
     * @param isRemoteTrusted if set to false enable flood detection.
     * @param spoofedAddressAndPort source address and port of both source and destination can be overwritten
     * those are used in buildNextHopPacket and for logging purpose.
     * If not provided the values of the underlying connection will be used.
     * There is two reason you may want to use this:
     * 1) WebSocket interface does not have .localPort, .remotePort, .localAddress, .remoteAddress
     * so providing them explicitly is the only way.
     * 2) If using a load balancer the addresses/ports that you want to expose are not really the one
     * used by the underlying socket connection.
     */
    constructor(socket: any, isRemoteTrusted: boolean, spoofedAddressAndPort?: Partial<AddrAndPorts>);
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
    readonly protocol: types.TransportProtocol;
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
