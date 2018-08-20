import { SyncEvent, VoidSyncEvent } from "ts-events-extended";

import * as types from "./types";
import * as core from "./core";
import * as misc from "./misc";

import { sipMethodName as apiSipMethodName } from "./api/ApiMessage";
import {
    IConnection,
    NetSocketConnection,
    WebSocketConnection,
    AddrAndPorts
} from "./IConnection";

import "colors";

//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {

    /** To store data contextually link to this socket */
    public readonly misc: any = {};

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
    public readonly evtClose = new SyncEvent<boolean>();

    /** 
     * Posted when underlying socket connect,
     * If underlying socket was already connected when 
     * when constructed posted synchronously when instantiated.
     * 
     *  */
    public readonly evtConnect = new VoidSyncEvent();

    /** API traffic is extracted, won't be posted here */
    public readonly evtResponse = new SyncEvent<types.Response>();
    public readonly evtRequest = new SyncEvent<types.Request>();


    /** Post chunk of data as received by the underlying connection*/
    public readonly evtData = new SyncEvent<Buffer>();
    /** Post chunk of data as wrote on underlying socket (once write return true )*/
    public readonly evtDataOut = new SyncEvent<Buffer>();
    /** Chance to modify packet before it is serialized */
    public readonly evtPacketPreWrite = new SyncEvent<types.Packet>();

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
    public readonly evtError = new SyncEvent<Error>();

    public static readonly maxBytesHeaders = 7820;
    public static readonly maxContentLength = 24624;
    public static readonly connectionTimeout = 3000;


    public get localPort() {
        return this.spoofedAddressAndPort.localPort || this.connection.localPort;
    }

    public get remotePort() {
        return this.spoofedAddressAndPort.remotePort || this.connection.remotePort;
    }

    public get localAddress() {
        return this.spoofedAddressAndPort.localAddress || this.connection.localAddress;
    }

    public get remoteAddress() {
        return this.spoofedAddressAndPort.remoteAddress || this.connection.remoteAddress;
    }

    private readonly connection: IConnection;

    private openTimer: NodeJS.Timer = null as any;



    /**
     * @param socket net.Socket ( include tls.TLSSocket ) or an instance of an object that implement
     * the HTML5's websocket interface. ( in node use 'ws' module ).
     * The type of this param is not exposed because WebSocket as defined in the dom is not present 
     * in a node environment and the modules "net" "tls" and "ws" should not have types definition 
     * in a web environment.
     * @param spoofedAddressAndPort source address and port of both source and destination can be overwritten
     * thoses are used in buildNextHopPacket and for logging purpose. 
     * If not provided the values of the underlying connection will be used.
     * There is two reason you may want to use this:
     * 1) WebSocket interface does not have .localPort, .remotePort, .localAddress, .remoteAddress 
     * so providing them explicitly is the only way.
     * 2) If using a load balancer the addresses/ports that you want to expose are not really the one
     * used by the underlying socket connection.
     */
    constructor(
        socket: any,
        private readonly spoofedAddressAndPort: Partial<AddrAndPorts> = {}
    ) {

        const matchNetSocket = (socket: WebSocket | import("ws") | import("net").Socket): socket is import("net").Socket => {
            return (socket as import("net").Socket).destroy !== undefined;
        };


        if (matchNetSocket(socket)) {

            this.connection = new NetSocketConnection(socket);

        } else {

            this.connection = new WebSocketConnection(socket);

        }

        const streamParser = core.makeStreamParser(
            sipPacket => {

                if (!!this.loggerEvt.evtPacketIn) {

                    this.loggerEvt.evtPacketIn.post(sipPacket);

                }

                if (misc.matchRequest(sipPacket)) {

                    this.evtRequest.post(sipPacket);

                } else {

                    this.evtResponse.post(sipPacket)

                }

            },
            (floodError) => this.connection.emit("error", floodError),
            Socket.maxBytesHeaders,
            Socket.maxContentLength
        );

        this.connection
            .once("error", error => {

                this.evtError.post(error);

                this.connection.emit("close", true);

            })
            .once("close", had_error => {

                //NOTE: 99.9% already cleared.
                clearTimeout(this.openTimer);

                this.connection.destroy();

                this.evtClose.post(had_error);

            })
            .on("data", data => {

                this.evtData.post(data);

                try {

                    streamParser(data);

                } catch (error) {

                    this.connection.emit("error", error);

                }

            })
            ;

        if (!this.connection.isConnecting()) {

            this.evtConnect.post();

        } else {

            this.openTimer = setTimeout(() => {

                if (!!this.evtClose.postCount) {

                    return;

                }

                this.connection.emit(
                    "error",
                    new Error(`Sip socket connection timeout after ${Socket.connectionTimeout}`)
                );

            }, Socket.connectionTimeout);

            this.connection.once(
                "connect",
                () => {

                    clearTimeout(this.openTimer);

                    this.evtConnect.post();

                }
            );

        }

    }

    /** 
     * Return true if sent successfully 
     * If socket had not connected yet throw error.
     * WARNING: If socket has closed will never resolve!
     * */
    public write(sipPacket: types.Packet): boolean | Promise<boolean> {

        if (!this.evtConnect.postCount) {

            throw new Error("Trying to write before socket connect");

        }

        if (this.evtClose.postCount) {

            return new Promise(resolve => { });

        }

        if (misc.matchRequest(sipPacket)) {

            const maxForwardsHeaderValue = sipPacket.headers["max-forwards"];

            if (maxForwardsHeaderValue !== undefined) {

                const maxForwards = parseInt(maxForwardsHeaderValue);

                if (maxForwards < 0) {
                    return false;
                }

            }

        }

        this.evtPacketPreWrite.post(sipPacket);

        /*NOTE: this could throw but it would mean that it's an error
        on our part as a packet that have been parsed should be stringifiable.*/
        const data = core.toData(sipPacket);

        let isSent: boolean | undefined = undefined;

        const prIsSent = new Promise<boolean>(
            resolve => this.connection.write(data, _isSent => {

                isSent = _isSent;

                resolve(isSent)

            })
        );

        prIsSent.then(isSent => {

            if (!isSent) {
                return;
            }

            if (!!this.loggerEvt.evtPacketOut) {

                this.loggerEvt.evtPacketOut.post(sipPacket);

            }

            this.evtDataOut.post(data);


        });

        return isSent !== undefined ? isSent : prIsSent;

    }


    /** Readonly, true if destroy have been called ( not called internally ) */
    public haveBeedDestroyed = false;

    /** Readonly, message provide when and if destroy have been called */
    public destroyReason: string | undefined = undefined;

    /** 
     * Destroy underlying connection, evtClose is posted synchronously.
     * No more traffic will occur on the socket.
     * */
    public destroy(reason?: string) {

        if (this.haveBeedDestroyed) {
            return;
        }

        this.haveBeedDestroyed = true;
        this.destroyReason = reason;

        this.connection.emit("close", false);

    }

    public get protocol(): types.TransportProtocol {

        return this.connection.protocol;

    }

    /** Return a clone of the packet ready for next hop */
    public buildNextHopPacket(sipRequest: types.Request): types.Request;
    public buildNextHopPacket(sipResponse: types.Response): types.Response;
    public buildNextHopPacket(sipPacket: types.Packet): types.Packet;
    public buildNextHopPacket(sipPacket: types.Packet): types.Packet {
        return misc.buildNextHopPacket(this, sipPacket);
    }

    private loggerEvt: {
        evtPacketIn?: SyncEvent<types.Packet>;
        evtPacketOut?: SyncEvent<types.Packet>;
    } = {};

    public enableLogger(
        params: {
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
        },
        log: typeof console.log = console.log.bind(console)
    ) {

        const prefix = `[ Sip Socket ${this.protocol} ]`.yellow;

        const getKey: (direction: "IN" | "OUT") => string =
            (params.colorizedTraffic === "IN") ? (
                direction => [
                    prefix,
                    params.remoteEndId,
                    direction === "IN" ? "=>" : "<=",
                    `${params.localEndId} ( ${params.socketId} )`,
                    "\n"
                ].join(" ")
            ) : (
                    direction => [
                        prefix,
                        `${params.localEndId} ( ${params.socketId} )`,
                        direction === "IN" ? "<=" : "=>",
                        params.remoteEndId,
                        "\n"
                    ].join(" ")
                );

        const getColor = (direction: "IN" | "OUT") =>
            (params.colorizedTraffic === direction) ? "yellow" : "white";

        const matchPacket = (sipPacket: types.Packet): boolean => params.ignoreApiTraffic ? !(
            misc.matchRequest(sipPacket) &&
            sipPacket.method === apiSipMethodName
        ) : true;

        const onPacket = (sipPacket: types.Packet, direction: "IN" | "OUT"): void =>
            log(getKey(direction), misc.stringify(sipPacket)[getColor(direction)]);


        if (!!params.incomingTraffic) {

            this.loggerEvt.evtPacketIn = new SyncEvent();

            this.loggerEvt.evtPacketIn.attach(
                matchPacket,
                sipPacket => onPacket(sipPacket, "IN")
            );

        }

        if (!!params.outgoingTraffic) {

            this.loggerEvt.evtPacketOut = new SyncEvent();

            this.loggerEvt.evtPacketOut.attach(
                matchPacket,
                sipPacket => onPacket(sipPacket, "OUT")
            );

        }

        if (!!params.error) {

            this.evtError.attachOnce(error =>
                log(`${prefix} ${params.socketId} Error`.red, error.toString(), error.stack)
            );

        }

        if (!!params.connection) {

            let message = `${prefix} ${params.socketId} connected`;

            if (!!this.evtConnect.postCount) {

                log(message);

            } else {

                this.evtConnect.attachOnce(() => log(message));

            }

        }

        if (!!params.close) {

            const getMessage = () => {

                let message = `${prefix} ${params.socketId} closed, `;

                if (this.haveBeedDestroyed) {

                    message += ".destroy have been called, ";

                    if (!!this.destroyReason) {

                        message += `reason: ${this.destroyReason}`;

                    } else {

                        message += "no reason have been provided.";

                    }

                } else {

                    message += ".destroy NOT called.";

                }

                return message;

            };

            if (!!this.evtClose.postCount) {

                log(getMessage());

            } else {

                this.evtClose.attachOnce(() => log(getMessage()));

            }

        }

    }

}

