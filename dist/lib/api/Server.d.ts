/// <reference types="node" />
import { Socket } from "../Socket";
import "colors";
export declare class Server {
    readonly handlers: Server.Handlers;
    private readonly logger;
    constructor(handlers: Server.Handlers, logger?: Partial<Server.Logger>);
    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    startListening(socket: Socket): void;
}
export declare namespace Server {
    type Handler<Params, Response> = {
        sanityCheck?: (params: Params) => boolean;
        handler: (params: Params, fromSocket: Socket) => Promise<Response>;
    };
    type Handlers = {
        [methodName: string]: Handler<any, any>;
    };
    type Logger = {
        onMethodNotImplemented(methodName: string, socket: Socket): void;
        onRequestMalformed(methodName: string, rawParams: Buffer, socket: Socket): void;
        onHandlerThrowError(methodName: string, params: any, error: Error, socket: Socket): void;
        onHandlerReturnNonStringifiableResponse(methodName: string, params: any, response: any, socket: Socket): void;
        onRequestSuccessfullyHandled(methodName: string, params: any, response: any, socket: Socket, rsvDate: Date): void;
    };
    function getDefaultLogger(options?: Partial<{
        idString: string;
        log: typeof console.log;
        displayOnlyErrors: boolean;
        hideKeepAlive: boolean;
    }>): Logger;
}
