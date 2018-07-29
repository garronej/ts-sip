"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var misc = require("../misc");
var ApiMessage_1 = require("./ApiMessage");
var util = require("util");
require("colors");
var Server = /** @class */ (function () {
    function Server(handlers, logger) {
        if (logger === void 0) { logger = {}; }
        var _this = this;
        this.handlers = handlers;
        this.logger = logger;
        (function () {
            var methodName = ApiMessage_1.keepAlive.methodName;
            var handler = {
                "sanityCheck": function (params) { return params === "PING"; },
                "handler": function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, "PONG"];
                }); }); }
            };
            _this.handlers[methodName] = handler;
        })();
    }
    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    Server.prototype.startListening = function (socket) {
        var _this = this;
        var mkDestroyMsg = function (message) { return "( handling local API ) " + message; };
        socket.evtRequest.attachExtract(function (sipRequest) { return ApiMessage_1.ApiMessage.Request.matchSip(sipRequest); }, function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
            var rcvTime, methodName, _a, handler, sanityCheck, params, response, error, _error_1, duration, sipRequestResp, prDidWriteSuccessfully;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        rcvTime = Date.now();
                        methodName = ApiMessage_1.ApiMessage.Request.readMethodName(sipRequest);
                        try {
                            _a = this.handlers[methodName], handler = _a.handler, sanityCheck = _a.sanityCheck;
                        }
                        catch (_c) {
                            if (!!this.logger.onMethodNotImplemented) {
                                this.logger.onMethodNotImplemented(methodName, socket);
                            }
                            socket.destroy(mkDestroyMsg("method " + methodName + " not implemented"));
                            return [2 /*return*/];
                        }
                        try {
                            params = ApiMessage_1.ApiMessage.parsePayload(sipRequest, sanityCheck);
                        }
                        catch (_d) {
                            if (!!this.logger.onRequestMalformed) {
                                this.logger.onRequestMalformed(methodName, misc.getPacketContent(sipRequest), socket);
                            }
                            socket.destroy(mkDestroyMsg("received malformed request params for method " + methodName));
                            return [2 /*return*/];
                        }
                        error = undefined;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler(params, socket)];
                    case 2:
                        response = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _error_1 = _b.sent();
                        error = _error_1;
                        return [3 /*break*/, 4];
                    case 4:
                        duration = Date.now() - rcvTime;
                        if (!!error) {
                            if (!!this.logger.onHandlerThrowError) {
                                this.logger.onHandlerThrowError(methodName, params, error, socket, duration);
                            }
                            socket.destroy(mkDestroyMsg("Handler thrown error"));
                            return [2 /*return*/];
                        }
                        try {
                            sipRequestResp = ApiMessage_1.ApiMessage.Response.buildSip(ApiMessage_1.ApiMessage.readActionId(sipRequest), response);
                        }
                        catch (_e) {
                            if (!!this.logger.onHandlerReturnNonStringifiableResponse) {
                                this.logger.onHandlerReturnNonStringifiableResponse(methodName, params, response, socket, duration);
                            }
                            socket.destroy(mkDestroyMsg("Handler returned non stringifiable response"));
                            return [2 /*return*/];
                        }
                        misc.buildNextHopPacket.pushVia(socket, sipRequestResp);
                        if (socket.evtClose.postCount === 0) {
                            prDidWriteSuccessfully = socket.write(sipRequestResp);
                        }
                        else {
                            prDidWriteSuccessfully = false;
                        }
                        if (!!this.logger.onRequestSuccessfullyHandled) {
                            this.logger.onRequestSuccessfullyHandled(methodName, params, response, socket, duration, prDidWriteSuccessfully);
                        }
                        return [4 /*yield*/, prDidWriteSuccessfully];
                    case 5:
                        if (!(_b.sent())) {
                            socket.destroy(mkDestroyMsg("write(response) did not return true"));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return Server;
}());
exports.Server = Server;
(function (Server) {
    function getDefaultLogger(options) {
        options = options || {};
        var idString = options.idString || "";
        var log = options.log || console.log.bind(console);
        var displayOnlyErrors = options.displayOnlyErrors || false;
        var hideKeepAlive = options.hideKeepAlive || false;
        var common = function (socket, methodName, duration, p, r, concat) {
            var isSocketClosedAndNotDestroyed = !!socket.evtClose.postCount && !socket.haveBeedDestroyed;
            var isError = (r === undefined) || isSocketClosedAndNotDestroyed;
            if (!isError && displayOnlyErrors) {
                return;
            }
            if (hideKeepAlive && ApiMessage_1.keepAlive.methodName === methodName) {
                return;
            }
            log([
                (isError ? "[ Sip API handler Error ]".red : "[ Sip API handler ]".green) + " " + idString + ":" + methodName.yellow,
                ((duration !== undefined) ? " " + duration + "ms" : "") + "\n",
                socket.localAddress + ":" + socket.localPort + " (local) <= " + socket.remoteAddress + ":" + socket.remotePort + " (remote)\n",
                isSocketClosedAndNotDestroyed ? "Socket closed while processing request ( not locally destroyed )\n" : "",
                !!p ? "---Params:".blue + "   " + JSON.stringify(p.params) + "\n" : "",
                !!r ? "---Response:".blue + "   " + JSON.stringify(r.response) + "\n" : "",
                concat
            ].join(""));
        };
        return {
            "onMethodNotImplemented": function (methodName, socket) { return common(socket, methodName, undefined, undefined, undefined, "Not implemented"); },
            "onRequestMalformed": function (methodName, rawParams, socket) { return common(socket, methodName, undefined, undefined, undefined, "Request malformed " + util.format({ "rawParams": "" + rawParams })); },
            "onHandlerThrowError": function (methodName, params, error, socket, duration) { return common(socket, methodName, duration, { params: params }, undefined, "Handler thrown error: " + util.format(error)); },
            "onHandlerReturnNonStringifiableResponse": function (methodName, params, response, socket, duration) { return common(socket, methodName, duration, { params: params }, undefined, "Non stringifiable resp " + util.format({ response: response })); },
            "onRequestSuccessfullyHandled": function (methodName, params, response, socket, duration) { return common(socket, methodName, duration, { params: params }, { response: response }); }
        };
    }
    Server.getDefaultLogger = getDefaultLogger;
})(Server = exports.Server || (exports.Server = {}));
exports.Server = Server;
