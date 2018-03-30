import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as WebSocket from "ws";

import * as types from "./types";
import * as core from "./core";
import * as misc from "./misc";

import { sipMethodName as apiSipMethodName } from "./api/ApiMessage";

import "colors";

//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {

    /** To store data contextually link to this socket */
    public readonly misc: any = {};

    public readonly evtResponse = new SyncEvent<types.Response>();
    public readonly evtRequest = new SyncEvent<types.Request>();

    public readonly evtClose = new SyncEvent<boolean>();
    public readonly evtConnect = new VoidSyncEvent();

    public readonly evtTimeout = new VoidSyncEvent();

    /**Emit chunk of data as received by the underlying connection*/
    public readonly evtData = new SyncEvent<Buffer>();
    public readonly evtDataOut = new SyncEvent<Buffer>();
    /** Provided only so the error can be logged */
    public readonly evtError = new SyncEvent<Error>();

    public readonly evtPacketPreWrite = new SyncEvent<types.Packet>();

    private static readonly maxBytesHeaders = 7820;
    private static readonly maxContentLength = 24624;
    private static readonly connectionTimeout = 3000;

    private __localPort__ = NaN;
    private __remotePort__ = NaN;
    private __localAddress__ = "";
    private __remoteAddress__ = "";

    public get localPort() {
        return this.spoofedAddressAndPort.localPort || this.__localPort__;
    }

    public get remotePort() {
        return this.spoofedAddressAndPort.remotePort || this.__remotePort__;
    }

    public get localAddress() {
        return this.spoofedAddressAndPort.localAddress || this.__localAddress__;
    }

    public get remoteAddress() {
        return this.spoofedAddressAndPort.remoteAddress || this.__remoteAddress__;
    }

    public haveBeedDestroyed = false;

    constructor(
        webSocket: WebSocket,
        addrAndPorts: Socket.AddrAndPorts
    );
    constructor(
        socket: net.Socket,
        spoofedAddrAndPorts?: Partial<Socket.AddrAndPorts>
    );
    constructor(
        private readonly connection: WebSocket | net.Socket,
        private readonly spoofedAddressAndPort: Partial<Socket.AddrAndPorts> = {}
    ) {

        let streamParser = core.makeStreamParser(
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
            (data, floodType) => {

                let message: string= "Flood! ";

                switch(floodType){
                    case "headers": 
                        message += `Sip Headers length > ${Socket.maxBytesHeaders} Bytes`;
                    case "content": 
                        message += `Sip content length > ${Socket.maxContentLength} Bytes`
                }

                let error= new Error(message);

                error["flood_data"]= data;

                error["flood_data_toString"]= data.toString("utf8");

                this.connection.emit("error", error);

            },
            Socket.maxBytesHeaders,
            Socket.maxContentLength
        );

        (this.connection as any)
            .once("error", obj => {

                this.evtError.post(Socket.matchWebSocket(this.connection) ? obj.error : obj);

                this.connection.emit("close", true)

            })
            .once("close", had_error => {


                if (Socket.matchWebSocket(this.connection)) {
                    this.connection.terminate();
                } else {
                    this.connection.destroy();
                }

                this.evtClose.post(had_error === true);

            })
            .on(
                Socket.matchWebSocket(this.connection) ? "message" : "data",
                (data: Buffer | string) => {

                    if (typeof data === "string") {

                        data = Buffer.from(data, "utf8");

                    }

                    this.evtData.post(data);


                    try {

                        streamParser(data);

                    } catch (error) {

                        this.connection.emit("error", error);

                    }


                }
            );

        if (Socket.matchWebSocket(this.connection)) {

            this.evtConnect.post(); //For post count

        } else {

            this.connection.setMaxListeners(Infinity)

            const setAddrAndPort = ((c: net.Socket) => (() => {
                this.__localPort__ = c.localPort;
                this.__remotePort__ = c.remotePort;
                this.__localAddress__ = c.localAddress;
                this.__remoteAddress__ = c.remoteAddress;
            }))(this.connection);

            setAddrAndPort();

            if (this.connection.localPort) {

                this.evtConnect.post(); //For post count

            } else {

                let timer = setTimeout(() => {

                    if (!!this.evtClose.postCount) {

                        return;

                    }

                    this.connection.emit(
                        "error",
                        new Error(`Sip socket connection timeout after ${Socket.connectionTimeout}`)
                    );

                }, Socket.connectionTimeout);

                this.connection.once(
                    this.connection["encrypted"] ? "secureConnect" : "connect",
                    () => {

                        clearTimeout(timer);

                        setAddrAndPort();

                        this.evtConnect.post();

                    }
                );

            }

        }

    }

    public readonly setKeepAlive: net.Socket['setKeepAlive'] = (...inputs) =>
        Socket.matchWebSocket(this.connection) ?
            undefined :
            this.connection.setKeepAlive.apply(this.connection, inputs)
        ;

    /** Return true if sent successfully */
    public write(sipPacket: types.Packet): boolean | Promise<boolean> {

        if (!this.evtConnect.postCount) {

            throw new Error("Trying to write before socket connect");

        }

        if (this.evtClose.postCount) {

            return new Promise(resolve => { });

        }


        if (misc.matchRequest(sipPacket)) {

            let maxForwardsHeaderValue = sipPacket.headers["max-forwards"];

            if (maxForwardsHeaderValue !== undefined) {

                let maxForwards = parseInt(maxForwardsHeaderValue);

                if (maxForwards < 0) {
                    return false;
                }

            }

        }

        this.evtPacketPreWrite.post(sipPacket);

        /*NOTE: this could throw but it would mean that it's an error
        on our part as a packet that have been parsed should be stringifiable.*/
        let data = core.toData(sipPacket);

        let out: Promise<boolean> | true;

        if (Socket.matchWebSocket(this.connection)) {

            out = new Promise<boolean>(
                resolve => (this.connection as WebSocket)
                    .send(data, { "binary": true }, error => resolve(error ? true : false))
            );

        } else {

            let flushed = this.connection.write(data);

            if (flushed) {

                out = true;

            } else {

                let boundTo = [];

                out = Promise.race([
                    new Promise<false>(
                        resolve => this.evtClose.attachOnce(boundTo, () => resolve(false))
                    ),
                    new Promise<true>(
                        resolve => (this.connection as net.Socket).once("drain", () => {
                            this.evtClose.detach(boundTo);
                            resolve(true);
                        })
                    )
                ]);

            }

        }

        ((out instanceof Promise) ? out : Promise.resolve(true))
            .then(isSent => {

                if (isSent) {

                    if (!!this.loggerEvt.evtPacketOut) {

                        this.loggerEvt.evtPacketOut.post(sipPacket);

                    }

                    this.evtDataOut.post(data);

                }

            })
            ;

        return out;

    }

    public destroy() {

        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */

        this.haveBeedDestroyed = true;

        this.connection.emit("close", false);

    }

    public get protocol(): "TCP" | "TLS" | "WSS" {

        if (Socket.matchWebSocket(this.connection)) {
            return "WSS";
        } else {
            return this.connection["encrypted"] ? "TLS" : "TCP";
        }

    }

    /** Return a clone of the packet ready for next hop */
    public buildNextHopPacket(
        sipRequest: types.Request
    ): types.Request;
    public buildNextHopPacket(
        sipResponse: types.Response
    ): types.Response;
    public buildNextHopPacket(
        sipPacket: types.Packet
    ): types.Packet;
    public buildNextHopPacket(
        sipPacket: types.Packet
    ): types.Packet {
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
        log: typeof console.log = console.log
    ) {

        const prefix = `[ Sip Socket ${this.protocol} ]`.yellow;

        const getKey: (direction: "IN" | "OUT") =>string = 
        (params.colorizedTraffic === "IN")?(
            direction=> [
                    prefix,
                    params.remoteEndId,
                    direction === "IN" ? "=>" : "<=",
                    `${params.localEndId} ( ${params.socketId} )`,
                    "\n"
            ].join(" ")
        ):(
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
                log(`${prefix} ${params.socketId} Error`.red, error)
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

            let getMessage = () => [
                `${prefix} ${params.socketId} closed`,
                this.haveBeedDestroyed ? "( locally destroyed )" : ""
            ].join(" ");

            if (!!this.evtClose.postCount) {

                log(getMessage());

            } else {

                this.evtClose.attachOnce(hasError => log(getMessage()));

            }

        }

    }

}

export namespace Socket {

    export type AddrAndPorts = {
        localPort: number;
        remotePort: number;
        localAddress: string;
        remoteAddress: string;
    };

    export function matchWebSocket(socket: net.Socket | WebSocket): socket is WebSocket {
        return (socket as WebSocket).terminate !== undefined;
    }

}
