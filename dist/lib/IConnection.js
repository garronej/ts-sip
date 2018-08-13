"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
/** Implementation for net.Socket and tls.Socket */
var NetSocketConnection = /** @class */ (function () {
    function NetSocketConnection(netSocket) {
        var _this = this;
        this.netSocket = netSocket;
        this.localPort = NaN;
        this.remotePort = NaN;
        this.localAddress = "";
        this.remoteAddress = "";
        if (this.netSocket["encrypted"]) {
            throw new Error("Class implementation reserved for net.Socket ( without TLS)");
        }
        this.netSocket.setMaxListeners(Infinity);
        var setAddrAndPort = function () {
            _this.localPort = _this.netSocket.localPort;
            if (_this.netSocket.remotePort !== undefined) {
                _this.remotePort = _this.netSocket.remotePort;
            }
            _this.localAddress = _this.netSocket.localAddress;
            if (!!_this.netSocket.remoteAddress) {
                _this.remoteAddress = _this.netSocket.remoteAddress;
            }
        };
        setAddrAndPort();
        var connectEvtName;
        if (this.netSocket["encrypted"]) {
            this.protocol = "TLS";
            connectEvtName = "secureConnect";
        }
        else {
            this.protocol = "TCP";
            connectEvtName = "connect";
        }
        this.netSocket.once(connectEvtName, function () { return setAddrAndPort(); });
    }
    NetSocketConnection.prototype.emit = function (evtName, evtData) {
        this.netSocket.emit(evtName, evtData);
    };
    ;
    NetSocketConnection.prototype.once = function (evtName, handler) {
        this.netSocket.once(evtName, handler);
        return this;
    };
    NetSocketConnection.prototype.on = function (_evtName, handler) {
        this.netSocket.on("data", handler);
        return this;
    };
    NetSocketConnection.prototype.isConnecting = function () {
        // return !this.netSocket.localPort;
        //TODO: see if ok
        return this.netSocket.connecting;
    };
    NetSocketConnection.prototype.destroy = function () {
        this.netSocket.destroy();
    };
    NetSocketConnection.prototype.write = function (data, callback) {
        var _this = this;
        var isFlushed = this.netSocket.write(data);
        if (isFlushed) {
            callback(true);
        }
        else {
            var onceClose_1;
            var onceDrain_1;
            Promise.race([
                new Promise(function (resolve) { return _this.netSocket.once("close", onceClose_1 = function () { return resolve(false); }); }),
                new Promise(function (resolve) { return _this.netSocket.once("drain", onceDrain_1 = function () { return resolve(true); }); })
            ]).then(function (isSent) {
                _this.netSocket.removeListener("close", onceClose_1);
                _this.netSocket.removeListener("drain", onceDrain_1);
                callback(isSent);
            });
        }
    };
    return NetSocketConnection;
}());
exports.NetSocketConnection = NetSocketConnection;
/** Implementation for WebSocket */
var WebSocketConnection = /** @class */ (function () {
    function WebSocketConnection(websocket, addrAndPort) {
        var _this = this;
        this.websocket = websocket;
        this.protocol = "WSS";
        this.evtMessageEvent = new ts_events_extended_1.SyncEvent();
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.websocket.onmessage = function (messageEvent) {
            return _this.evtMessageEvent.post(messageEvent);
        };
        this.websocket.onerror = function () {
            websocket.onerror = function () { };
            _this.evtError.post(new Error("Native Websocket Error"));
        };
        this.websocket.onclose = function () {
            websocket.onclose = function () { };
            _this.evtClose.post(_this.evtError.postCount !== 0);
        };
        if (this.isConnecting()) {
            this.websocket.onopen = function () { return _this.evtConnect.post(); };
        }
        this.localPort = addrAndPort.localPort;
        this.remotePort = addrAndPort.remotePort;
        this.localAddress = addrAndPort.localAddress;
        this.remoteAddress = addrAndPort.remoteAddress;
    }
    WebSocketConnection.prototype.emit = function (evtName, evtData) {
        var _this = this;
        switch (evtName) {
            case "error":
                (function (error) {
                    _this.evtError.post(error);
                })(evtData);
                break;
            case "close":
                (function (had_error) {
                    _this.evtClose.post(had_error);
                })(evtData);
                break;
        }
    };
    ;
    WebSocketConnection.prototype.once = function (evtName, handler) {
        var _this = this;
        switch (evtName) {
            case "error":
                (function (handler) {
                    _this.evtError.attachOnce(function (error) { return handler(error); });
                })(handler);
                break;
            case "close":
                (function (handler) {
                    _this.evtClose.attachOnce(function (had_error) { return handler(had_error); });
                })(handler);
                break;
            case "connect":
                (function (handler) {
                    _this.evtConnect.attachOnce(function () { return handler(); });
                })(handler);
                break;
        }
        return this;
    };
    WebSocketConnection.prototype.on = function (_evtName, handler) {
        this.evtMessageEvent.attach(function (messageEvent) {
            return handler(Buffer.from(messageEvent.data));
        });
        return this;
    };
    WebSocketConnection.prototype.isConnecting = function () {
        return this.websocket.readyState === this.websocket.CONNECTING;
    };
    WebSocketConnection.prototype.destroy = function () {
        this.evtMessageEvent.detach();
        this.websocket.close();
    };
    WebSocketConnection.prototype.write = function (data, callback) {
        try {
            var dataAsString = data.toString("utf8");
            //This should not have to be casted :(
            this.websocket.send(dataAsString);
        }
        catch (_a) {
            callback(false);
        }
        callback(true);
    };
    return WebSocketConnection;
}());
exports.WebSocketConnection = WebSocketConnection;
