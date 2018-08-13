process.once("unhandledRejection", error => { throw error; });

import * as sipLibrary from "../lib";
import { SyncEvent } from "ts-events-extended";

const fakeSockets: ({ idString: string; socket: sipLibrary.Socket })[] = [

    {
        "idString": "socketNotClosed",
        "socket": (() => {

            const socket: sipLibrary.Socket = ({
                "localAddress": "192.168.0.2",
                "localPort": 2222,
                "remoteAddress": "192.168.0.3",
                "remotePort": 3333,
                "evtClose": new SyncEvent<boolean>(),
                "hasBeenDestroyed": false
            }) as any;

            return socket;


        })()
    },
    {
        "idString": "socketDestroyed",
        "socket": (() => {

            const socket: sipLibrary.Socket = ({
                "localAddress": "192.168.0.2",
                "localPort": 2222,
                "remoteAddress": "192.168.0.3",
                "remotePort": 3333,
                "evtClose": new SyncEvent<boolean>(),
                "hasBeenDestroyed": false
            }) as any;

            socket.evtClose.post(false);

            socket.haveBeedDestroyed = true;

            return socket;


        })()
    },
    {
        "idString": "socketClosed",
        "socket": (() => {

            const socket: sipLibrary.Socket = ({
                "localAddress": "192.168.0.2",
                "localPort": 2222,
                "remoteAddress": "192.168.0.3",
                "remotePort": 3333,
                "evtClose": new SyncEvent<boolean>(),
                "hasBeenDestroyed": false
            }) as any;

            socket.evtClose.post(false);

            return socket;

        })()
    }


];


for (const { idString, socket } of fakeSockets) {

    const logger = sipLibrary.api.Server.getDefaultLogger({ idString });

    logger.onMethodNotImplemented("myMethod", socket);

    logger.onRequestMalformed("myMethod", Buffer.from("{ won't deserialize ]", "utf8"), socket);

    logger.onHandlerThrowError(
        "myMethod", { "p1": "foo bar", "p2": 42 }, new Error("<thrown by handler>"), socket, 3000
    );

    logger.onHandlerReturnNonStringifiableResponse(
        "myMethod", undefined, (() => {

            const out = {};

            out["out"] = out;

            return out;

        })(), socket, 4000
    );

    logger.onRequestSuccessfullyHandled(
        "myMethod", 42, { "status": "SUCCESS" }, socket, 10, Promise.resolve(true)
    );

}
