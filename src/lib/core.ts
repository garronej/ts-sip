import * as sip from "sip";
import * as _sdp_ from "sip/sdp";
import * as types from "./types";

export function makeStreamParser( 
    handler: (sipPacket: types.Packet) => void,
    onFlood: (data: Buffer, floodType: "headers" | "content" ) => void,
    maxBytesHeaders: number,
    maxContentLength: number
): ((data: Buffer) => void) {

    let streamParser= sip.makeStreamParser(
        handler,
        (dataAsBinaryStr, floodType)=> onFlood(
            Buffer.from(dataAsBinaryStr, "binary"), 
            floodType
        ),
        maxBytesHeaders,
        maxContentLength,
    );

    return data => streamParser(data.toString("binary"));

}


export function toData(sipPacket: types.Packet): Buffer {

    let dataAsBinaryString: string= sip.stringify(sipPacket);

    if (!!sipPacket.headers["record-route"]) {

        let split = dataAsBinaryString.split("\r\n");

        for (let i = 0; i < split.length; i++) {

            let match = split[i].match(/^Record-Route:(.+)$/);

            if (match) {

                split[i] = match[1]
                    .replace(/\s/g, "")
                    .split(",")
                    .map(v => `Record-Route: ${v}`)
                    .join("\r\n")
                    ;
                
                break;

            }

        }

        dataAsBinaryString= split.join("\r\n");

    }

    return Buffer.from(dataAsBinaryString, "binary");

}

export const parse: (data: Buffer) => types.Packet = data => {

    let sipPacket: types.Packet = sip.parse(data.toString("binary"));

    if (!sipPacket.headers.via) {
        sipPacket.headers.via = [];
    }

    return sipPacket;

};

export const parseUri: (uri: string) => types.ParsedUri = sip.parseUri;

export const generateBranch: () => string = sip.generateBranch;

export const stringifyUri: (parsedUri: types.ParsedUri) => string = sip.stringifyUri;

export const parseSdp: (rawSdp: string) => any = _sdp_.parse;

export const stringifySdp: (sdp: any) => string = _sdp_.stringify;
