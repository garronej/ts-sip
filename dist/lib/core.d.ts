/// <reference types="node" />
import * as types from "./types";
export declare function makeStreamParser(handler: (sipPacket: types.Packet) => void, onFlood: (data: Buffer, floodType: "headers" | "content") => void, maxBytesHeaders: number, maxContentLength: number): ((data: Buffer) => void);
export declare function toData(sipPacket: types.Packet): Buffer;
export declare const parse: (data: Buffer) => types.Packet;
export declare const parseUri: (uri: string) => types.ParsedUri;
export declare const generateBranch: () => string;
export declare const stringifyUri: (parsedUri: types.ParsedUri) => string;
export declare const parseSdp: (rawSdp: string) => any;
export declare const stringifySdp: (sdp: any) => string;
