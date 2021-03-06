import { Socket } from "../Socket";
import * as types from "../types";
export declare function sendRequest<Params, Response>(socket: Socket, methodName: string, params: Params, extra?: {
    timeout?: number;
    sanityCheck?: (response: Response) => boolean;
}): Promise<Response>;
export declare function enableErrorLogging(socket: Socket, errorLogger: Partial<ErrorLogger>): void;
export declare namespace enableErrorLogging {
    const miscKey = " __api_client_error_logger__ ";
}
export declare function enableKeepAlive(socket: Socket, interval?: number): void;
export declare class SendRequestError extends Error {
    readonly methodName: string;
    readonly params: any;
    readonly cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE";
    readonly misc: {};
    constructor(methodName: string, params: any, cause: "CANNOT SEND REQUEST" | "SOCKET CLOSED BEFORE RECEIVING RESPONSE" | "REQUEST TIMEOUT" | "MALFORMED RESPONSE");
}
export declare type ErrorLogger = {
    onRequestNotSent(methodName: string, params: any, socket: Socket): void;
    onClosedConnection(methodName: string, params: any, socket: Socket): void;
    onRequestTimeout(methodName: string, params: any, timeoutValue: number, socket: Socket): void;
    onMalformedResponse(methodName: string, params: any, rawResponse: types.IBuffer, socket: Socket): void;
};
export declare function getDefaultErrorLogger(options?: Partial<{
    idString: string;
    log: typeof console.log;
}>): ErrorLogger;
