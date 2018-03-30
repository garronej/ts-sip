
import { Socket } from "../Socket";
import * as misc from "../misc";
import * as types from "../types";
import { ApiMessage, keepAlive } from "./ApiMessage";

import "colors";

export class Server {

    constructor(
        public readonly handlers: Server.Handlers,
        private readonly logger: Partial<Server.Logger>= {}
    ) {

        (()=>{

            const methodName = keepAlive.methodName;
            type Params = keepAlive.Params;
            type Response = keepAlive.Response;


            let handler: Server.Handler<Params, Response>= {
                "sanityCheck": params => params === "PING", 
                "handler": async ()=> "PONG"
            };

            this.handlers[methodName]= handler;

        })();

    }

    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    public startListening(socket: Socket) {

        socket.evtRequest.attachExtract(
            sipRequest => ApiMessage.Request.matchSip(sipRequest),
            async sipRequest => {

                let rsvDate= new Date();

                let methodName = ApiMessage.Request.readMethodName(sipRequest);

                try{

                    var { handler, sanityCheck }= this.handlers[methodName];

                }catch{

                    if( !!this.logger.onMethodNotImplemented ){

                        this.logger.onMethodNotImplemented(methodName, socket);

                    }

                    socket.destroy();

                    return;

                }

                let params: any;

                try {

                    params = ApiMessage.parsePayload(
                        sipRequest, 
                        sanityCheck
                    );

                }catch{

                    if( !!this.logger.onRequestMalformed ){

                        this.logger.onRequestMalformed(
                            methodName, misc.getPacketContent(sipRequest), socket
                        );

                    }

                    socket.destroy();

                    return;

                }

                let response: any;

                try {

                    response = await handler(params, socket);

                } catch( error ){

                    if( !!this.logger.onHandlerThrowError ){

                        this.logger.onHandlerThrowError(methodName, params, error, socket);

                    }

                    socket.destroy();

                    return;

                }

                let sipRequestResp: types.Request;

                try {

                    sipRequestResp = ApiMessage.Response.buildSip(
                        ApiMessage.readActionId(sipRequest),
                        response
                    );

                } catch{

                    if( !!this.logger.onHandlerReturnNonStringifiableResponse ){

                        this.logger.onHandlerReturnNonStringifiableResponse(
                            methodName, params, response, socket
                        );

                    }

                    socket.destroy();

                    return;

                }

                if( !!this.logger.onRequestSuccessfullyHandled ){

                    this.logger.onRequestSuccessfullyHandled(
                        methodName, params, response, socket, rsvDate
                    );

                }

                misc.buildNextHopPacket.pushVia(
                    socket,
                    sipRequestResp
                );

                socket.write(sipRequestResp);

            }
        );

    }

}

export namespace Server {

    export type Handler<Params, Response> = {
        sanityCheck?: (params: Params) => boolean;
        handler: (params: Params, fromSocket: Socket) => Promise<Response>;
    };

    export type Handlers = {
        [methodName: string]: Handler<any, any>;
    };

    export type Logger = {
        onMethodNotImplemented(methodName: string, socket: Socket): void;
        onRequestMalformed(methodName: string, rawParams: Buffer, socket: Socket): void;
        onHandlerThrowError(methodName: string, params: any, error: Error, socket: Socket): void;
        onHandlerReturnNonStringifiableResponse(methodName: string, params: any, response: any, socket: Socket): void;
        onRequestSuccessfullyHandled(methodName: string, params: any, response: any, socket: Socket, rsvDate: Date): void;
    };

    export function getDefaultLogger(
        options?: Partial<{
            idString: string;
            log: typeof console.log;
            displayOnlyErrors: boolean;
            hideKeepAlive: boolean;
        }>
    ): Logger {

        options= options || {};

        let idString= options.idString || "";
        let log= options.log || console.log;
        let displayOnlyErrors= options.displayOnlyErrors || false;
        let hideKeepAlive= options.hideKeepAlive || false;

        const base= (socket: Socket, methodName: string, isError: boolean, date= new Date()) => [
            `${date.getHours()}h ${date.getMinutes()}m ${date.getSeconds()}s ${date.getMilliseconds()}ms`,
            isError?`[ Sip API ${idString} Handler Error ]`.red:`[ Sip API ${idString} Handler ]`.green,
            `${socket.localAddress}:${socket.localPort} (local)`,
            "<=",
            `${socket.remoteAddress}:${socket.remotePort} (remote)`,
            methodName.yellow,
            "\n"
        ].join(" ");

        return {
            "onMethodNotImplemented": (methodName, socket) =>
                log(`${base(socket, methodName, true)}Not implemented`),
            "onRequestMalformed": (methodName, rawParams, socket) =>
                log(`${base(socket, methodName, true)}Request malformed`, { "rawParams": `${rawParams}` }),
            "onHandlerThrowError": (methodName, params, error, socket) =>
                log(`${base(socket, methodName, true)}Handler throw error`, error),
            "onHandlerReturnNonStringifiableResponse": (methodName, params, response, socket) =>
                log(`${base(socket, methodName, true)}Non stringifiable resp`, { response }),
            "onRequestSuccessfullyHandled":
                (methodName, params, response, socket, rsvDate) => {

                    if( displayOnlyErrors ){
                        return;
                    }

                    if( hideKeepAlive && keepAlive.methodName === methodName ){
                        return;
                    }

                    log([
                        base(socket, methodName, false, rsvDate),
                        `${"---Params:".blue}   ${JSON.stringify(params)}\n`,
                        `${"---Response:".blue} ${JSON.stringify(response)}\n`,
                        `${"---Runtime:".yellow}  ${Date.now()-rsvDate.getTime()}ms\n`
                    ].join(""));

                }
        };

    }

}