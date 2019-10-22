import { Socket } from "../Socket";
import * as misc from "../misc";
import * as types from "../types";
import { ApiMessage, keepAlive } from "./ApiMessage";
import setPrototypeOf = require("setprototypeof");

export async function sendRequest<Params, Response>(
    socket: Socket,
    methodName: string,
    params: Params,
    extra: {
        timeout?: number;
        sanityCheck?: (response: Response) => boolean;
    } = {}
): Promise<Response> {

    const mkDestroyMsg = (message: string) => `( calling remote API ) ${message}`;

    let errorLogger: Partial<ErrorLogger> = socket.misc[enableErrorLogging.miscKey] || {};

    let sipRequest = ApiMessage.Request.buildSip(methodName, params);

    misc.buildNextHopPacket.pushVia(socket, sipRequest);

    let actionId = ApiMessage.readActionId(sipRequest);

    let writeSuccess = await socket.write(sipRequest);

    if (!writeSuccess) {

        if (!!errorLogger.onRequestNotSent) {

            errorLogger.onRequestNotSent(methodName, params, socket);

        }

        socket.destroy(
            mkDestroyMsg("write did not return true (request not sent)")
        );

        throw new SendRequestError(
            methodName,
            params,
            "CANNOT SEND REQUEST"
        );

    }

    let sipRequestResponse: types.Request;

    let timeoutValue = extra.timeout || 5 * 60 * 1000;

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

            if (!!errorLogger.onRequestTimeout) {

                errorLogger.onRequestTimeout(methodName, params, timeoutValue, socket);

            }

            socket.destroy(
                mkDestroyMsg( "Request timed out")
            );

        } else {

            if (!!errorLogger.onClosedConnection) {

                errorLogger.onClosedConnection(methodName, params, socket);

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

        if (!!errorLogger.onMalformedResponse) {

            errorLogger.onMalformedResponse(
                methodName, params, misc.getPacketContent(sipRequestResponse), socket
            );

        }

        socket.destroy("Response is malformed");

        throw sendRequestError;

    }

    return response;

}

export function enableErrorLogging(
    socket: Socket,
    errorLogger: Partial<ErrorLogger>
): void {
    socket.misc[enableErrorLogging.miscKey] = errorLogger;
}

export namespace enableErrorLogging {
    export const miscKey = " __api_client_error_logger__ ";
}

export function enableKeepAlive(
    socket: Socket,
    interval = 120 * 1000
): void {

    const { methodName } = keepAlive;
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

            const before= Date.now();

            try {

                await socket.evtClose.waitFor(interval);

                break;

            } catch{ }

            if( Math.abs( Date.now() - before  - interval) > 10000  ){

                socket.destroy([
                    "A keep alive 'PING' haven't been sent as scheduled, we prefer closing the connection.",
                    "This happen for example while running in react native and the app is in the background.",
                    "The setTimeout callbacks are called only when the app is woke up"
                ].join(" "));

                break;

            }



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
        setPrototypeOf(this, new.target.prototype);

    }
}

export type ErrorLogger = {
    onRequestNotSent(methodName: string, params: any, socket: Socket): void;
    onClosedConnection(methodName: string, params: any, socket: Socket): void;
    onRequestTimeout(methodName: string, params: any, timeoutValue: number, socket: Socket): void;
    onMalformedResponse(methodName: string, params: any, rawResponse: types.IBuffer, socket: Socket): void;
};

export function getDefaultErrorLogger(
    options?: Partial<{
        idString: string;
        log: typeof console.log;
    }>
): ErrorLogger {

    options = options || {};

    let idString = options.idString || "";
    let log = options.log || console.log.bind(console);

    const base = (socket: Socket, methodName: string, params: any) => [
        `[ Sip API ${idString} call Error ]`.red,
        methodName,
        `${socket.localAddress}:${socket.localPort} (local)`,
        "=>",
        `${socket.remoteAddress}:${socket.remotePort} (remote)`,
        "\n",
        `params: ${JSON.stringify(params)}\n`,
    ].join(" ");

    return {
        "onRequestNotSent": (methodName, params, socket) =>
            log(`${base(socket, methodName, params)}Request not sent`),
        "onClosedConnection": (methodName, params, socket) =>
            log(`${base(socket, methodName, params)}Remote connection lost`),
        "onRequestTimeout": (methodName, params, timeoutValue, socket) =>
            log(`${base(socket, methodName, params)}Request timeout after ${timeoutValue}ms`),
        "onMalformedResponse": (methodName, params, rawResponse, socket) =>
            log(`${base(socket, methodName, params)}Malformed response\nrawResponse: ${rawResponse}`)
    };

}
