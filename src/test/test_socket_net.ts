process.once("unhandledRejection", error => { throw error; });

import * as sipLibrary from "../lib";
import * as net from "net";

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
        {},
        sipLibrary.api.Server.getDefaultLogger({
            idString,
            "hideKeepAlive": false
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
            "ignoreApiTraffic": false
        });

        apiServer.startListening(socketToClient);

        sipLibrary.api.client.enableKeepAlive(socketToClient, 3000);

        sipLibrary.api.client.enableErrorLogging(
            socketToClient,
            sipLibrary.api.client.getDefaultErrorLogger({ idString })
        );

        socketToClient.evtClose.attachOnce(had_error=>{

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
        "incomingTraffic": true,
        "outgoingTraffic": true,
        "colorizedTraffic": "OUT",
        "ignoreApiTraffic": false
    });


    apiServer.startListening(socketToServer);

    sipLibrary.api.client.enableKeepAlive(socketToServer, 3000);

    sipLibrary.api.client.enableErrorLogging(
        socketToServer,
        sipLibrary.api.client.getDefaultErrorLogger({ idString })
    );

    setTimeout(()=> {
        
        socketToServer.destroy("Closing socket client side");

    }, 4000);

}





