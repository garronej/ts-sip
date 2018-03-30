/// <reference types="node" />
import * as types from "./types";
/** For debug purpose only, assume sipPacket content is UTF-8 encoded text */
export declare function stringify(sipPacket: types.Packet): string;
export declare function matchRequest(sipPacket: types.Packet): sipPacket is types.Request;
export declare function clonePacket(sipRequest: types.Request): types.Request;
export declare function clonePacket(sipResponse: types.Response): types.Response;
export declare function clonePacket(sipPacket: types.Packet): types.Packet;
/** Safely set text based content ( encoded in utf8 ) */
export declare function setPacketContent(sipPacket: types.Packet, data: Buffer): void;
export declare function setPacketContent(sipPacket: types.Packet, str: string): void;
/** Get the RAW content as buffer */
export declare function getPacketContent(sipPacket: types.Packet): Buffer;
export declare function readSrflxAddrInSdp(sdp: string): string | undefined;
export declare function isPlainMessageRequest(sipRequest: types.Request, withAuth?: "WITH AUTH" | undefined): boolean;
export declare function parsePath(path: string): types.AoRWithParsedUri[];
export declare function stringifyPath(parsedPath: types.AoRWithParsedUri[]): string;
export declare function parseOptionTags(headerFieldValue: string | undefined): string[];
export declare function hasOptionTag(headers: types.Headers, headerField: string, optionTag: string): boolean;
/** Do nothing if already present */
export declare function addOptionTag(headers: types.Headers, headerField: string, optionTag: string): void;
export declare function filterSdpCandidates(keep: {
    host: boolean;
    srflx: boolean;
    relay: boolean;
}, sdp: string): string;
export declare function getContact(sipRequest: types.Request): types.AoR | undefined;
export declare function isResponse(sipRequestNextHop: types.Request, sipResponse: types.Response): boolean;
/** Return a clone of the packet ready for next hop */
export declare function buildNextHopPacket(socket: buildNextHopPacket.ISocket, sipRequestAsReceived: types.Request): types.Request;
export declare function buildNextHopPacket(socket: buildNextHopPacket.ISocket, sipResponseAsReceived: types.Response): types.Response;
export declare function buildNextHopPacket(socket: buildNextHopPacket.ISocket, sipPacketAsReceived: types.Packet): types.Packet;
/** pop and shift refer to stack operations */
export declare namespace buildNextHopPacket {
    interface ISocket {
        protocol: "TCP" | "TLS" | "WSS";
        localPort: number;
        localAddress: string;
    }
    function popRoute(sipRequest: types.Request): void;
    function pushPath(socket: ISocket, sipRequestRegister: types.Request): void;
    function pushRecordRoute(socket: ISocket, sipRequest: types.Request): void;
    function pushVia(socket: ISocket, sipRequest: types.Request): void;
    function popVia(sipResponse: types.Response): void;
    /** Need to be called before Via is poped */
    function rewriteRecordRoute(socket: ISocket, sipResponse: types.Response): void;
    function decrementMaxForward(sipRequest: types.Request): void;
}
