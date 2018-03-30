import { Socket } from "../Socket";
import * as misc from "../misc";
import * as types from "../types";
import { ApiMessage, keepAlive } from "./ApiMessage";

export async function sendRequest<Params, Response>(
    socket: Socket,
    methodName: string,
    params: Params,
    extra: {
        timeout?: number;
        sanityCheck?: (response: Response) => boolean;
    } = {}
): Promise<Response> {

    let logger: Partial<Logger>= socket.misc[ enableLogging.miscKey ] || {};

    let sipRequest = ApiMessage.Request.buildSip(methodName, params);

    misc.buildNextHopPacket.pushVia(socket, sipRequest);

    let actionId = ApiMessage.readActionId(sipRequest);

    let writeSuccess = await socket.write(sipRequest);

    if (!writeSuccess) {

        throw new SendRequestError(
            methodName,
            params,
            "CANNOT SEND REQUEST"
        );

    }

    let sipRequestResponse: types.Request;

    let timeoutValue= extra.timeout || 5 * 60 * 1000;

    try {

        sipRequestResponse = await Promise.race([
            socket.evtRequest.attachOnceExtract(
                sipRequestResponse => ApiMessage.Response.matchSip(sipRequestResponse, actionId),
                timeoutValue,
                () => { }
            ),
            new Promise<never>(
                (_, reject) => socket.evtClose.attachOnce(sipRequest, () => reject(new Error("CLOSE")))
            )
        ]);

    } catch (error) {

        let sendRequestError = new SendRequestError(
            methodName,
            params,
            (error.message === "CLOSE") ?
                "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT"
        );

        if (sendRequestError.cause === "REQUEST TIMEOUT") {

            if( !!logger.onRequestTimeout ){

                logger.onRequestTimeout(methodName, params, timeoutValue, socket);

            }

            socket.destroy();

        }else{

            if( !!logger.onClosedConnection ){

                logger.onClosedConnection(methodName, params, socket);

            }

        }

        throw sendRequestError;

    }

    let response: any;

    try {

        response = ApiMessage.parsePayload(
            sipRequestResponse,
            extra.sanityCheck
        );

    } catch {

        let sendRequestError = new SendRequestError(
            methodName,
            params,
            "MALFORMED RESPONSE"
        );

        sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;

        if( !!logger.onMalformedResponse ){

            logger.onMalformedResponse(
                methodName, params, misc.getPacketContent(sipRequestResponse), socket
            );

        }

        socket.destroy();

        throw sendRequestError;

    }

    return response;

}

export function enableLogging(
    socket: Socket,
    logger: Partial<Logger>
): void {

    socket.misc[ enableLogging.miscKey ]= logger;

}

export namespace enableLogging {

    export const miscKey= "__api_client_logger__";

}

export function enableKeepAlive(
    socket: Socket,
    interval = 120 * 1000
): void {

    const methodName = keepAlive.methodName;
    type Params = keepAlive.Params;
    type Response = keepAlive.Response;

    (async () => {

        if (!socket.evtConnect.postCount) {

            await socket.evtConnect.waitFor();

        }

        while (true) {

            try {

                await sendRequest<Params, Response>(
                    socket,
                    methodName,
                    "PING",
                    {
                        "timeout": 5 * 1000,
                        "sanityCheck": response => response === "PONG"
                    }
                );

            } catch{

                break;

            }

            try {

                await socket.evtClose.waitFor(interval);

                break;

            } catch{ }

        }

    })();

}

export class SendRequestError extends Error {

    public readonly misc = {};

    constructor(
        public readonly methodName: string,
        public readonly params: any,
        public readonly cause:
            "CANNOT SEND REQUEST" |
            "SOCKET CLOSED BEFORE RECEIVING RESPONSE" |
            "REQUEST TIMEOUT" |
            "MALFORMED RESPONSE"
    ) {
        super(`Send request ${methodName} ${cause}`);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export type Logger = {
    onClosedConnection(methodName: string, params: any, socket): void;
    onRequestTimeout(methodName: string, params: any, timeoutValue: number, socket: Socket): void;
    onMalformedResponse(methodName: string, params: any, rawResponse: Buffer, socket: Socket): void;
};

export function getDefaultLogger(
    options?: Partial<{
        idString: string;
        log: typeof console.log;
    }>
): Logger {

    options = options || {};

    let idString = options.idString || "";
    let log = options.log || console.log;

    const base = (socket: Socket, methodName: string, params: any) => [
        `[ Sip API ${idString} call Error ]`.red,
        `${socket.localAddress}:${socket.localPort} (local)`,
        "=>",
        `${socket.remoteAddress}:${socket.remotePort} (remote)`,
        methodName,
        "\n",
        `params: ${JSON.stringify(params)}\n`,
    ].join(" ");

    return {
        "onClosedConnection": (methodName, params, socket) =>
            log(`${base(socket, methodName, params)}Remote connection lost`),
        "onRequestTimeout": (methodName, params, timeoutValue, socket) =>
            log(`${base(socket, methodName, params)}Request timeout after ${timeoutValue}ms`),
        "onMalformedResponse": (methodName, params, rawResponse, socket) =>
            log(`${base(socket, methodName, params)}Malformed response\nrawResponse: ${rawResponse}`)
    };

}