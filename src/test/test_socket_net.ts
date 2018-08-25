process.once("unhandledRejection", error => { throw error; });

import * as sipLibrary from "../lib";
import * as net from "net";

export namespace foo {

    export const methodName = "foo";

    export type Params = {
        p1: string;
        p2: number;
    };

    /** Sim for which we already have a route */
    export type Response = string;

}


const handlers: sipLibrary.api.Server.Handlers = {};

(() => {

    const methodName = foo.methodName;
    type Params = foo.Params;
    type Response = foo.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.p1 === "string" &&
            typeof params.p2 === "number"
        ),
        "handler": async (params, fromSocket) => {

            return `${params.p1} ${params.p2}`;

        }
    };

    handlers[methodName] = handler;

})();

(async () => {

    const server = await new Promise<net.Server>(resolve =>
        net.createServer()
            .once("error", error => { throw error; })
            .listen(0, "127.0.0.1")
            .once("listening", function () {

                const port = (this.address() as net.AddressInfo).port;

                startClient(port);

                resolve(this);


            })
    );

    const idString = "SocketToClient";

    const apiServer = new sipLibrary.api.Server(
        handlers,
        sipLibrary.api.Server.getDefaultLogger({
            idString,
            "hideKeepAlive": false,
            "displayOnlyErrors": true
        })
    );

    server.on("connection", async netSocket => {

        const socketToClient = new sipLibrary.Socket(
            netSocket
        );

        socketToClient.enableLogger({
            "socketId": idString,
            "remoteEndId": "CLIENT",
            "localEndId": "SERVER",
            "connection": true,
            "error": true,
            "close": true,
            "incomingTraffic": true,
            "outgoingTraffic": true,
            "colorizedTraffic": "IN",
            "ignoreApiTraffic": true
        });

        apiServer.startListening(socketToClient);

        sipLibrary.api.client.enableKeepAlive(socketToClient, 3000);

        sipLibrary.api.client.enableErrorLogging(
            socketToClient,
            sipLibrary.api.client.getDefaultErrorLogger({ idString })
        );

        socketToClient.evtClose.attachOnce(had_error => {

            console.log("Socket to client closed", { had_error });

            server.close();

            console.log("Process should terminate");

        });

    });

})();

async function startClient(port: number) {

    console.log({ port });

    const idString = "SocketToServer";

    const apiServer = new sipLibrary.api.Server(
        {},
        sipLibrary.api.Server.getDefaultLogger({
            idString,
            "hideKeepAlive": false
        })
    );

    const socketToServer = new sipLibrary.Socket(
        net.connect({
            "host": "127.0.0.1",
            "port": port,
            "localAddress": "127.0.0.1"
        }),
        {
            "localAddress": "spoofed_local_address"
        }
    );

    socketToServer.enableLogger({
        "socketId": idString,
        "remoteEndId": "SERVER",
        "localEndId": "CLIENT",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "OUT",
        "ignoreApiTraffic": true
    });


    apiServer.startListening(socketToServer);

    sipLibrary.api.client.enableKeepAlive(socketToServer, 3000);

    sipLibrary.api.client.enableErrorLogging(
        socketToServer,
        sipLibrary.api.client.getDefaultErrorLogger({ idString })
    );

    socketToServer.evtConnect.attachOnce(async () => {

        console.log("connect");

        const tasks: Promise<string>[] = [];

        const before = Date.now();

        for (let i = 0; i < 5000; i++) {

            //await new Promise<void>(resolve => setTimeout(resolve, 30));
            await new Promise<void>(resolve => setImmediate(resolve));

            tasks[tasks.length] = (async () => {

                //const before = Date.now();

                const str = await sipLibrary.api.client.sendRequest<foo.Params, foo.Response>(
                    socketToServer,
                    foo.methodName,
                    { "p1": "bar", "p2": 43 },
                    { "timeout": 5000, "sanityCheck": response => typeof response === "string" }
                ).catch(() => "error");

                //console.log(`Total request duration: ${Date.now() - before}`);

                return str;

            })();

        }

        Promise.all(tasks).then(r => {
            
            console.log(`====================================================>Total duration: ${Date.now() - before}`);

            socketToServer.destroy("Closing socket client side");

        });



    });



}





