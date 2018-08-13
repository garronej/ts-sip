import * as sip from "./core/sip";
import * as _sdp_ from "./core/sdp";
import * as types from "./types";

export function makeStreamParser(
    handler: (sipPacket: types.Packet) => void,
    onFlood: (floodError: makeStreamParser.FloodError) => void,
    maxBytesHeaders: number,
    maxContentLength: number
): ((data: Buffer) => void) {

    let streamParser = sip.makeStreamParser(
        handler,
        (dataAsBinaryStr, floodType) => onFlood(
            new makeStreamParser.FloodError(
                floodType,
                Buffer.from(dataAsBinaryStr, "binary"),
                maxBytesHeaders,
                maxContentLength
            )
        ),
        maxBytesHeaders,
        maxContentLength,
    );

    return data => streamParser(data.toString("binary"));

}

export namespace makeStreamParser {

    export class FloodError extends Error {
        constructor(
            public readonly floodType: "HEADERS" | "CONTENT",
            public readonly data: Buffer,
            public maxBytesHeaders: number,
            public maxContentLength: number
        ) {
            super((() => {

                switch (floodType) {
                    case "HEADERS":
                        return `Sip Headers length > ${maxBytesHeaders} Bytes`;
                    case "CONTENT":
                        return `Sip content length > ${maxContentLength} Bytes`
                }

            })());

            Object.setPrototypeOf(this, new.target.prototype);
        }

        public toString(): string {

            return [
                `SIP Socket flood: ${this.message}`,
                `cause: ${this.floodType}`,
                `data ( as binary string ): >${this.data.toString("binary")}<`
            ].join("\n");

        }

    }

}


export function toData(sipPacket: types.Packet): Buffer {

    let dataAsBinaryString: string = sip.stringify(sipPacket);

    return Buffer.from(dataAsBinaryString, "binary");

}

//** Can throw */
export const parse: (data: Buffer) => types.Packet = data => {

    const sipPacket: types.Packet | undefined = sip.parse(data.toString("binary"));

    if (!sipPacket) {

        throw new Error("Can't parse SIP packet");

    }

    return sipPacket;

};

export const parseUri: (uri: string) => types.ParsedUri = sip.parseUri;

export const generateBranch: () => string = sip.generateBranch;

export const stringifyUri: (parsedUri: types.ParsedUri) => string = sip.stringifyUri;

export const parseSdp: (rawSdp: string) => any = _sdp_.parse;

export const stringifySdp: (sdp: any) => string = _sdp_.stringify;
