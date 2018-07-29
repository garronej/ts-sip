"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sipLibrary = require("../lib");
var ts_events_extended_1 = require("ts-events-extended");
var fakeSockets = [
    {
        "idString": "socketNotClosed",
        "socket": (function () {
            var socket = ({
                "localAddress": "192.168.0.2",
                "localPort": 2222,
                "remoteAddress": "192.168.0.3",
                "remotePort": 3333,
                "evtClose": new ts_events_extended_1.SyncEvent(),
                "hasBeenDestroyed": false
            });
            return socket;
        })()
    },
    {
        "idString": "socketDestroyed",
        "socket": (function () {
            var socket = ({
                "localAddress": "192.168.0.2",
                "localPort": 2222,
                "remoteAddress": "192.168.0.3",
                "remotePort": 3333,
                "evtClose": new ts_events_extended_1.SyncEvent(),
                "hasBeenDestroyed": false
            });
            socket.evtClose.post(false);
            socket.haveBeedDestroyed = true;
            return socket;
        })()
    },
    {
        "idString": "socketClosed",
        "socket": (function () {
            var socket = ({
                "localAddress": "192.168.0.2",
                "localPort": 2222,
                "remoteAddress": "192.168.0.3",
                "remotePort": 3333,
                "evtClose": new ts_events_extended_1.SyncEvent(),
                "hasBeenDestroyed": false
            });
            socket.evtClose.post(false);
            return socket;
        })()
    }
];
for (var _i = 0, fakeSockets_1 = fakeSockets; _i < fakeSockets_1.length; _i++) {
    var _a = fakeSockets_1[_i], idString = _a.idString, socket = _a.socket;
    var logger = sipLibrary.api.Server.getDefaultLogger({ idString: idString });
    logger.onMethodNotImplemented("myMethod", socket);
    logger.onRequestMalformed("myMethod", Buffer.from("{ won't deserialize ]", "utf8"), socket);
    logger.onHandlerThrowError("myMethod", { "p1": "foo bar", "p2": 42 }, new Error("<thrown by handler>"), socket, 3000);
    logger.onHandlerReturnNonStringifiableResponse("myMethod", undefined, (function () {
        var out = {};
        out["out"] = out;
        return out;
    })(), socket, 4000);
    logger.onRequestSuccessfullyHandled("myMethod", 42, { "status": "SUCCESS" }, socket, 10, Promise.resolve(true));
}
