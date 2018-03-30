/// <reference types="node" />
import { Socket } from "../Socket";
export declare function sendRequest<Params, Response>(socket: Socket, methodName: string, params: Params, extra?: {
    timeout?: number;
    sanityCheck?: (response: Response) => boolean;
}): Promise<Response>;
export declare function enableLogging(socket: Socket, logger: Partial<Logger>): void;
export declare namespace enableLogging {
    const miscKey = "__api_client_logger__";
}
export declare function enableKeepAlive(socket: Socket, interval?: number): void;
export declare class SendRequestError extends Error {
    readonly methodName: string;
    readonly params: any;
    readonly cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE";
    readonly misc: {};
    constructor(methodName: string, params: any, cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE");
}
export declare type Logger = {
    onClosedConnection(methodName: string, params: any, socket): void;
    onRequestTimeout(methodName: string, params: any, timeoutValue: number, socket: Socket): void;
    onMalformedResponse(methodName: string, params: any, rawResponse: Buffer, socket: Socket): void;
};
export declare function getDefaultLogger(options?: Partial<{
    idString: string;
    log: typeof console.log;
}>): Logger;
