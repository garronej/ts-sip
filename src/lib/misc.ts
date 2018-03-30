import * as core from "./core";
import * as types from "./types";

//export const regIdKey = "reg-id";
//export const instanceIdKey = "+sip.instance";

/** For debug purpose only, assume sipPacket content is UTF-8 encoded text */
export function stringify(sipPacket: types.Packet): string {
    return core.toData(sipPacket).toString("utf8");
}

export function matchRequest(sipPacket: types.Packet): sipPacket is types.Request {
    return "method" in sipPacket;
}

//TODO: optimize
export function clonePacket(sipRequest: types.Request): types.Request;
export function clonePacket(sipResponse: types.Response): types.Response;
export function clonePacket(sipPacket: types.Packet): types.Packet;
export function clonePacket(sipPacket: types.Packet): types.Packet {
    return core.parse(core.toData(sipPacket));
}

/** Safely set text based content ( encoded in utf8 ) */
export function setPacketContent(sipPacket: types.Packet, data: Buffer): void;
export function setPacketContent(sipPacket: types.Packet, str: string): void;
export function setPacketContent(sipPacket: types.Packet, data: Buffer | string ): void {

    if( typeof data === "string" ){
        data= Buffer.from(data, "utf8");
    }

    sipPacket.headers["content-length"] = data.byteLength;

    sipPacket.content = data.toString("binary");

}

/** Get the RAW content as buffer */
export function getPacketContent(sipPacket: types.Packet): Buffer {

    return Buffer.from(sipPacket.content, "binary");

}

export function readSrflxAddrInSdp(sdp: string): string | undefined {

    for (let m_i of core.parseSdp(sdp).m) {

        if (m_i.media !== "audio") continue;

        for (let a_i of m_i.a) {

            let match = a_i.match(
                /^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/
            );

            if (match) return match[1];

        }
    }

    return undefined;

}


export function isPlainMessageRequest(
    sipRequest: types.Request,
    withAuth: "WITH AUTH" | undefined = undefined
): boolean {

    return (
        sipRequest.method === "MESSAGE" &&
        ( !withAuth || "authorization" in sipRequest.headers ) &&
        sipRequest.headers["content-type"]!.toLowerCase().match(/^text\/plain/) 
    );

}


export function parsePath(path: string): types.AoRWithParsedUri[] {

    const message = core.parse(Buffer.from([
        `DUMMY _ SIP/2.0`,
        `Path: ${path}`,
        "\r\n"
    ].join("\r\n"), "utf8")) as types.Request;

    return message.headers.path!;

}

export function stringifyPath(parsedPath: types.AoRWithParsedUri[]): string {

    const message = core.parse(Buffer.from([
        `DUMMY _ SIP/2.0`,
        "\r\n"
    ].join("\r\n"), "utf8"));

    message.headers.path = parsedPath;

    return core.toData(message).toString("utf8").match(/\r\nPath:\ +(.*)\r\n/)![1];

}

export function parseOptionTags(headerFieldValue: string | undefined): string[] {

    if (!headerFieldValue){
         return [];
    }

    return headerFieldValue.split(",").map(optionTag => optionTag.replace(/\s/g, ""));

}

export function hasOptionTag(
    headers: types.Headers,
    headerField: string,
    optionTag: string
): boolean {

    let headerFieldValue = headers[headerField];

    let optionTags = parseOptionTags(headerFieldValue);

    return optionTags.indexOf(optionTag) >= 0;

}

/** Do nothing if already present */
export function addOptionTag(
    headers: types.Headers,
    headerField: string,
    optionTag: string
) {

    if (hasOptionTag(headers, headerField, optionTag)) {
        return;
    }

    let optionTags = parseOptionTags(headers[headerField]);

    optionTags.push(optionTag);

    headers[headerField] = optionTags.join(", ");

}




export function filterSdpCandidates(
    keep: { host: boolean; srflx: boolean; relay: boolean; },
    sdp: string
): string {

    let shouldKeepCandidate = (candidateLine: string): boolean => {

        return (
            (keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/))
        );

    };

    let parsedSdp = core.parseSdp(sdp);

    let arr = parsedSdp.m[0].a;

    for (let line of [...arr]) {

        if (!line.match(/^candidate/)) continue;

        if (!shouldKeepCandidate(line)) {
            arr.splice(arr.indexOf(line), 1);
        }

    }

    return core.stringifySdp(sdp);


}

export function getContact(
    sipRequest: types.Request
): types.AoR | undefined {

    if( !sipRequest.headers.contact ||  !sipRequest.headers.contact.length){
        return undefined;
    }

    return sipRequest.headers.contact[0];

}





export function isResponse(
    sipRequestNextHop: types.Request, 
    sipResponse: types.Response
): boolean {
    return sipResponse.headers.via[0].params["branch"] ===
        sipRequestNextHop.headers.via[0].params["branch"];
}


/** Return a clone of the packet ready for next hop */
export function buildNextHopPacket(
    socket: buildNextHopPacket.ISocket,
    sipRequestAsReceived: types.Request
): types.Request;
export function buildNextHopPacket(
    socket: buildNextHopPacket.ISocket,
    sipResponseAsReceived: types.Response
): types.Response;
export function buildNextHopPacket(
    socket: buildNextHopPacket.ISocket,
    sipPacketAsReceived: types.Packet
): types.Packet;
export function buildNextHopPacket(
    socket: buildNextHopPacket.ISocket,
    sipPacketAsReceived: types.Packet
): types.Packet {

    let sipPacketNextHop= clonePacket(sipPacketAsReceived);

    if (matchRequest(sipPacketNextHop)) {

        let sipRequestNextHop = sipPacketNextHop;

        buildNextHopPacket.popRoute(sipRequestNextHop);

        if (sipRequestNextHop.method === "REGISTER") {

            let sipRequestRegister = sipRequestNextHop;

            buildNextHopPacket.pushPath(socket, sipRequestRegister);

        } else {

            if ( getContact(sipRequestNextHop) ) {

                buildNextHopPacket.pushRecordRoute(socket, sipRequestNextHop);

            }

        }

        buildNextHopPacket.pushVia(socket, sipRequestNextHop);

        buildNextHopPacket.decrementMaxForward(sipRequestNextHop);

    } else {

        let sipResponseNextHop = sipPacketNextHop;

        buildNextHopPacket.rewriteRecordRoute(socket, sipResponseNextHop);

        buildNextHopPacket.popVia(sipResponseNextHop);

    }

    return sipPacketNextHop;

}

/** pop and shift refer to stack operations */
export namespace buildNextHopPacket {

    export interface ISocket {
        protocol: "TCP" | "TLS" | "WSS";
        localPort: number;
        localAddress: string;
    }

    function buildLocalAoRWithParsedUri(socket: ISocket): types.AoRWithParsedUri {

        return {
            "uri": {
                ...core.parseUri(`sip:${socket.localAddress}:${socket.localPort}`),
                "params": {
                    "transport": socket.protocol,
                    "lr": null
                }
            },
            "params": {}
        };

    }

    export function popRoute(
        sipRequest: types.Request
    ): void {

        if (!sipRequest.headers.route) {
            return;
        }

        sipRequest.headers.route.shift();

        //For tests
        if( !sipRequest.headers.route.length ){
            delete sipRequest.headers.route;
        }

    }

    export function pushPath(
        socket: ISocket,
        sipRequestRegister: types.Request
    ): void {

        addOptionTag(sipRequestRegister.headers, "supported", "path");

        if (!sipRequestRegister.headers.path) {
            sipRequestRegister.headers.path = [];
        }

        sipRequestRegister.headers.path!.unshift(
            buildLocalAoRWithParsedUri(socket)
        );

    }

    export function pushRecordRoute(
        socket: ISocket,
        sipRequest: types.Request
    ): void {

        if (!sipRequest.headers["record-route"]) {
            sipRequest.headers["record-route"] = [];
        }

        sipRequest.headers["record-route"]!.unshift(
            buildLocalAoRWithParsedUri(socket)
        );

    }

    export function pushVia(socket: ISocket, sipRequest: types.Request): void {

        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": socket.protocol,
            "host": socket.localAddress,
            "port": socket.localPort,
            "params": {
                "branch": (() => {

                    let via = sipRequest.headers.via;

                    return via.length ? `z9hG4bK-${via[0].params["branch"]}` : core.generateBranch();

                })(),
                "rport": null
            }
        });

    }

    export function popVia(sipResponse: types.Response): void {

        sipResponse.headers.via.shift();

    }

    /** Need to be called before Via is poped */
    export function rewriteRecordRoute(socket: ISocket, sipResponse: types.Response): void {

        let recordRoute = sipResponse.headers["record-route"];

        if (recordRoute) {

            recordRoute[
                recordRoute.length - sipResponse.headers.via.length + 1
            ] = buildLocalAoRWithParsedUri(socket);

        }

    }

    export function decrementMaxForward(sipRequest: types.Request): void {

            let maxForwards = parseInt(sipRequest.headers["max-forwards"]);

            if (isNaN(maxForwards)) {
                throw new Error("Max-Forwards not defined");
            }

            sipRequest.headers["max-forwards"] = `${maxForwards - 1}`;

    }

}
