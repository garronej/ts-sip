"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var core = require("./core");
var misc = require("./misc");
var ApiMessage_1 = require("./api/ApiMessage");
require("colors");
//TODO: make a function to test if message are well formed: have from, to via ect.
var Socket = /** @class */ (function () {
    function Socket(connection, spoofedAddressAndPort) {
        if (spoofedAddressAndPort === void 0) { spoofedAddressAndPort = {}; }
        var _this = this;
        this.connection = connection;
        this.spoofedAddressAndPort = spoofedAddressAndPort;
        /** To store data contextually link to this socket */
        this.misc = {};
        /**
         *
         * Post has_error.
         *
         * Posted synchronously ( with false ) when destroy is called,
         * OR
         * ( with true ) when evtError is posted
         * OR
         * ( with false ) when underlying socket post "close"
         *
         */
        this.evtClose = new ts_events_extended_1.SyncEvent();
        /**
         * Posted when underlying socket connect,
         * If underlying socket was already connected when
         * when constructed posted synchronously when instantiated.
         *
         *  */
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        /** API traffic is extracted, won't be posted here */
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        /** Post chunk of data as received by the underlying connection*/
        this.evtData = new ts_events_extended_1.SyncEvent();
        /** Post chunk of data as wrote on underlying socket (once write return true )*/
        this.evtDataOut = new ts_events_extended_1.SyncEvent();
        /** Chance to modify packet before it is serialized */
        this.evtPacketPreWrite = new ts_events_extended_1.SyncEvent();
        /**
         * Provided only so the error can be logged.
         *
         * Posted when underlying socket emit "error" event
         * OR
         * When the socket is flooded
         * OR
         * When the stream parser throw an Error ( possible ? )
         * OR
         * Socket took to much time to connect.
         *
         *
         * */
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.__localPort__ = NaN;
        this.__remotePort__ = NaN;
        this.__localAddress__ = "";
        this.__remoteAddress__ = "";
        this.setKeepAlive = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return Socket.matchWebSocket(_this.connection) ?
                undefined :
                _this.connection.setKeepAlive.apply(_this.connection, inputs);
        };
        /** Readonly, true if destroy have been called ( not called internally ) */
        this.haveBeedDestroyed = false;
        /** Readonly, message provide when and if destroy have been called */
        this.destroyReason = undefined;
        this.loggerEvt = {};
        var streamParser = core.makeStreamParser(function (sipPacket) {
            if (!!_this.loggerEvt.evtPacketIn) {
                _this.loggerEvt.evtPacketIn.post(sipPacket);
            }
            if (misc.matchRequest(sipPacket)) {
                _this.evtRequest.post(sipPacket);
            }
            else {
                _this.evtResponse.post(sipPacket);
            }
        }, function (data, floodType) {
            var message = "Flood! ";
            switch (floodType) {
                case "headers":
                    message += "Sip Headers length > " + Socket.maxBytesHeaders + " Bytes";
                    break;
                case "content":
                    message += "Sip content length > " + Socket.maxContentLength + " Bytes";
                    break;
            }
            var error = new Error(message);
            error["flood_data"] = data;
            error["flood_data_toString"] = data.toString("utf8");
            _this.connection.emit("error", error);
        }, Socket.maxBytesHeaders, Socket.maxContentLength);
        this.connection
            .once("error", function (obj) {
            _this.evtError.post(Socket.matchWebSocket(_this.connection) ? obj.error : obj);
            _this.connection.emit("close", true);
        })
            .once("close", function (had_error) {
            if (Socket.matchWebSocket(_this.connection)) {
                _this.connection.terminate();
            }
            else {
                _this.connection.destroy();
            }
            _this.evtClose.post(had_error === true);
        })
            .on(Socket.matchWebSocket(this.connection) ? "message" : "data", function (data) {
            if (typeof data === "string") {
                data = Buffer.from(data, "utf8");
            }
            _this.evtData.post(data);
            try {
                streamParser(data);
            }
            catch (error) {
                _this.connection.emit("error", error);
            }
        });
        if (Socket.matchWebSocket(this.connection)) {
            this.evtConnect.post(); //For post count
        }
        else {
            this.connection.setMaxListeners(Infinity);
            var setAddrAndPort_1 = (function (c) { return (function () {
                _this.__localPort__ = c.localPort;
                if (c.remotePort !== undefined) {
                    _this.__remotePort__ = c.remotePort;
                }
                _this.__localAddress__ = c.localAddress;
                if (!!c.remoteAddress) {
                    _this.__remoteAddress__ = c.remoteAddress;
                }
            }); })(this.connection);
            setAddrAndPort_1();
            if (this.connection.localPort) {
                this.evtConnect.post(); //For post count
            }
            else {
                var timer_1 = setTimeout(function () {
                    if (!!_this.evtClose.postCount) {
                        return;
                    }
                    _this.connection.emit("error", new Error("Sip socket connection timeout after " + Socket.connectionTimeout));
                }, Socket.connectionTimeout);
                this.connection.once(this.connection["encrypted"] ? "secureConnect" : "connect", function () {
                    clearTimeout(timer_1);
                    setAddrAndPort_1();
                    _this.evtConnect.post();
                });
            }
        }
    }
    Object.defineProperty(Socket.prototype, "localPort", {
        get: function () {
            return this.spoofedAddressAndPort.localPort || this.__localPort__;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remotePort", {
        get: function () {
            return this.spoofedAddressAndPort.remotePort || this.__remotePort__;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "localAddress", {
        get: function () {
            return this.spoofedAddressAndPort.localAddress || this.__localAddress__;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remoteAddress", {
        get: function () {
            return this.spoofedAddressAndPort.remoteAddress || this.__remoteAddress__;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Return true if sent successfully
     * If socket had not connected yet throw error.
     * WARNING: If socket has closed will never resolve!
     * */
    Socket.prototype.write = function (sipPacket) {
        var _this = this;
        if (!this.evtConnect.postCount) {
            throw new Error("Trying to write before socket connect");
        }
        if (this.evtClose.postCount) {
            return new Promise(function (resolve) { });
        }
        if (misc.matchRequest(sipPacket)) {
            var maxForwardsHeaderValue = sipPacket.headers["max-forwards"];
            if (maxForwardsHeaderValue !== undefined) {
                var maxForwards = parseInt(maxForwardsHeaderValue);
                if (maxForwards < 0) {
                    return false;
                }
            }
        }
        this.evtPacketPreWrite.post(sipPacket);
        /*NOTE: this could throw but it would mean that it's an error
        on our part as a packet that have been parsed should be stringifiable.*/
        var data = core.toData(sipPacket);
        var out;
        if (Socket.matchWebSocket(this.connection)) {
            out = new Promise(function (resolve) { return _this.connection
                .send(data, { "binary": true }, function (error) { return resolve(error ? true : false); }); });
        }
        else {
            var flushed = this.connection.write(data);
            if (flushed) {
                out = true;
            }
            else {
                var boundTo_1 = [];
                out = Promise.race([
                    new Promise(function (resolve) { return _this.evtClose.attachOnce(boundTo_1, function () { return resolve(false); }); }),
                    new Promise(function (resolve) { return _this.connection.once("drain", function () {
                        _this.evtClose.detach(boundTo_1);
                        resolve(true);
                    }); })
                ]);
            }
        }
        ((out instanceof Promise) ? out : Promise.resolve(true))
            .then(function (isSent) {
            if (isSent) {
                if (!!_this.loggerEvt.evtPacketOut) {
                    _this.loggerEvt.evtPacketOut.post(sipPacket);
                }
                _this.evtDataOut.post(data);
            }
        });
        return out;
    };
    /**
     * Destroy underlying connection, evtClose is posted synchronously.
     * No more traffic will occur on the socket.
     * */
    Socket.prototype.destroy = function (reason) {
        if (this.haveBeedDestroyed) {
            return;
        }
        this.haveBeedDestroyed = true;
        this.destroyReason = reason;
        this.connection.emit("close", false);
    };
    Object.defineProperty(Socket.prototype, "protocol", {
        get: function () {
            if (Socket.matchWebSocket(this.connection)) {
                return "WSS";
            }
            else {
                return this.connection["encrypted"] ? "TLS" : "TCP";
            }
        },
        enumerable: true,
        configurable: true
    });
    Socket.prototype.buildNextHopPacket = function (sipPacket) {
        return misc.buildNextHopPacket(this, sipPacket);
    };
    Socket.prototype.enableLogger = function (params, log) {
        var _this = this;
        if (log === void 0) { log = console.log.bind(console); }
        var prefix = ("[ Sip Socket " + this.protocol + " ]").yellow;
        var getKey = (params.colorizedTraffic === "IN") ? (function (direction) { return [
            prefix,
            params.remoteEndId,
            direction === "IN" ? "=>" : "<=",
            params.localEndId + " ( " + params.socketId + " )",
            "\n"
        ].join(" "); }) : (function (direction) { return [
            prefix,
            params.localEndId + " ( " + params.socketId + " )",
            direction === "IN" ? "<=" : "=>",
            params.remoteEndId,
            "\n"
        ].join(" "); });
        var getColor = function (direction) {
            return (params.colorizedTraffic === direction) ? "yellow" : "white";
        };
        var matchPacket = function (sipPacket) { return params.ignoreApiTraffic ? !(misc.matchRequest(sipPacket) &&
            sipPacket.method === ApiMessage_1.sipMethodName) : true; };
        var onPacket = function (sipPacket, direction) {
            return log(getKey(direction), misc.stringify(sipPacket)[getColor(direction)]);
        };
        if (!!params.incomingTraffic) {
            this.loggerEvt.evtPacketIn = new ts_events_extended_1.SyncEvent();
            this.loggerEvt.evtPacketIn.attach(matchPacket, function (sipPacket) { return onPacket(sipPacket, "IN"); });
        }
        if (!!params.outgoingTraffic) {
            this.loggerEvt.evtPacketOut = new ts_events_extended_1.SyncEvent();
            this.loggerEvt.evtPacketOut.attach(matchPacket, function (sipPacket) { return onPacket(sipPacket, "OUT"); });
        }
        if (!!params.error) {
            this.evtError.attachOnce(function (error) {
                return log((prefix + " " + params.socketId + " Error").red, error);
            });
        }
        if (!!params.connection) {
            var message_1 = prefix + " " + params.socketId + " connected";
            if (!!this.evtConnect.postCount) {
                log(message_1);
            }
            else {
                this.evtConnect.attachOnce(function () { return log(message_1); });
            }
        }
        if (!!params.close) {
            var getMessage_1 = function () {
                var message = prefix + " " + params.socketId + " closed, ";
                if (_this.haveBeedDestroyed) {
                    message += ".destroy have been called, ";
                    if (!!_this.destroyReason) {
                        message += "reason: " + _this.destroyReason;
                    }
                    else {
                        message += "no reason have been provided.";
                    }
                }
                else {
                    message += ".destroy NOT called.";
                }
                return message;
            };
            if (!!this.evtClose.postCount) {
                log(getMessage_1());
            }
            else {
                this.evtClose.attachOnce(function () { return log(getMessage_1()); });
            }
        }
    };
    Socket.maxBytesHeaders = 7820;
    Socket.maxContentLength = 24624;
    Socket.connectionTimeout = 3000;
    return Socket;
}());
exports.Socket = Socket;
(function (Socket) {
    function matchWebSocket(socket) {
        return socket.terminate !== undefined;
    }
    Socket.matchWebSocket = matchWebSocket;
})(Socket = exports.Socket || (exports.Socket = {}));
exports.Socket = Socket;
