
import { Socket } from "../Socket";
import * as misc from "../misc";
import * as types from "../types";
import { ApiMessage, keepAlive } from "./ApiMessage";
import * as util from "util";

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

        const mkDestroyMsg = (message: string) => `( handling local API ) ${message}`;

        socket.evtRequest.attachExtract(
            sipRequest => ApiMessage.Request.matchSip(sipRequest),
            async sipRequest => {

                const rcvTime= Date.now();

                const methodName = ApiMessage.Request.readMethodName(sipRequest);

                try{

                    var { handler, sanityCheck }= this.handlers[methodName];

                }catch{

                    if( !!this.logger.onMethodNotImplemented ){

                        this.logger.onMethodNotImplemented(methodName, socket);

                    }

                    socket.destroy(
                        mkDestroyMsg(`method ${methodName} not implemented`)
                    );

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

                    socket.destroy(
                        mkDestroyMsg(`received malformed request params for method ${methodName}`)
                    );

                    return;

                }

                let response: any;

                let error: Error | undefined= undefined;

                try {

                    response = await handler(params, socket);

                } catch( _error ){

                    error= _error;

                }

                const duration = Date.now() - rcvTime;

                if( !!error ){

                    if( !!this.logger.onHandlerThrowError ){

                        this.logger.onHandlerThrowError(methodName, params, error, socket, duration);

                    }

                    socket.destroy(
                        mkDestroyMsg(
                            `${methodName} handler thrown error: ${error instanceof Error ? error.message: error}`
                        )
                    );

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
                            methodName, params, response, socket, duration
                        );

                    }

                    socket.destroy(
                        mkDestroyMsg("Handler returned non stringifiable response")
                    );

                    return;

                }

                misc.buildNextHopPacket.pushVia(
                    socket,
                    sipRequestResp
                );

                let prDidWriteSuccessfully: Promise<boolean> | boolean;

                if( socket.evtClose.postCount === 0 ){

                    prDidWriteSuccessfully=  socket.write(sipRequestResp);

                }else{

                    prDidWriteSuccessfully= false;

                }

                if( !!this.logger.onRequestSuccessfullyHandled ){

                    this.logger.onRequestSuccessfullyHandled(
                        methodName, params, response, socket, duration, prDidWriteSuccessfully
                    );

                }

                if(!(await prDidWriteSuccessfully)){

                    socket.destroy(
                        mkDestroyMsg("write(response) did not return true")
                    );

                }


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
        onRequestMalformed(methodName: string, rawParams: types.IBuffer, socket: Socket): void;
        onHandlerThrowError(methodName: string, params: any, error: Error, socket: Socket, duration: number): void;
        onHandlerReturnNonStringifiableResponse(methodName: string, params: any, response: any, socket: Socket, duration: number): void;
        onRequestSuccessfullyHandled(methodName: string, params: any, response: any, socket: Socket, duration: number, prDidWriteSuccessfully: Promise<boolean> | boolean): void;
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

        const idString= options.idString || "";
        const log= options.log || console.log.bind(console);
        const displayOnlyErrors= options.displayOnlyErrors || false;
        const hideKeepAlive= options.hideKeepAlive || false;

        const common= function(
            socket: Socket, 
            methodName: string, 
            duration: number | undefined, 
            p: ({ params: any }) | undefined, 
            r: ({response: any}) | undefined, 
            concat?: string
        ) {

            const isSocketClosedAndNotDestroyed= !!socket.evtClose.postCount && !socket.haveBeedDestroyed;

            const isError = (r === undefined) || isSocketClosedAndNotDestroyed;

            if (!isError && displayOnlyErrors) {
                return;
            }

            if (hideKeepAlive && keepAlive.methodName === methodName) {
                return;
            }

            log([
                `${isError ? `[ Sip API handler Error ]`.red : `[ Sip API handler ]`.green} ${idString}:${methodName.yellow}`,
                ((duration !== undefined) ? ` ${duration}ms` : "") + "\n",
                `${socket.localAddress}:${socket.localPort} (local) <= ${socket.remoteAddress}:${socket.remotePort} (remote)\n`,
                isSocketClosedAndNotDestroyed ? `Socket closed while processing request ( not locally destroyed )\n` : "",
                !!p ? `${"---Params:".blue}   ${JSON.stringify(p.params)}\n` : "",
                !!r ? `${"---Response:".blue}   ${JSON.stringify(r.response)}\n` : "",
                concat
            ].join(""));

        };

        return {
            "onMethodNotImplemented": (methodName, socket) => common(
                socket, methodName, undefined, undefined, undefined,
                "Not implemented"
            ),
            "onRequestMalformed": (methodName, rawParams, socket) => common(
                socket, methodName, undefined, undefined, undefined, 
                `Request malformed ${util.format({ "rawParams": `${rawParams}` })}`
            ),
            "onHandlerThrowError": (methodName, params, error, socket, duration) => common(
                socket, methodName, duration, { params }, undefined, 
                `Handler thrown error: ${util.format(error)}`
            ),
            "onHandlerReturnNonStringifiableResponse": (methodName, params, response, socket, duration) => common(
                socket, methodName, duration, { params }, undefined, 
                `Non stringifiable resp ${util.format({response})}`
            ),
            "onRequestSuccessfullyHandled": (methodName, params, response, socket, duration) => common(
                socket, methodName, duration, { params }, { response }
            )
        };

    }

}