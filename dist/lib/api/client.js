"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
var evt_1 = require("evt");
var misc = require("../misc");
var ApiMessage_1 = require("./ApiMessage");
var setPrototypeOf = require("setprototypeof");
function sendRequest(socket, methodName, params, extra) {
    if (extra === void 0) { extra = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var mkDestroyMsg, errorLogger, sipRequest, actionId, writeSuccess, sipRequestResponse, timeoutValue, ctx_1, error_1, sendRequestError, response, sendRequestError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mkDestroyMsg = function (message) { return "( calling remote API ) " + message; };
                    errorLogger = socket.misc[enableErrorLogging.miscKey] || {};
                    sipRequest = ApiMessage_1.ApiMessage.Request.buildSip(methodName, params);
                    misc.buildNextHopPacket.pushVia(socket, sipRequest);
                    actionId = ApiMessage_1.ApiMessage.readActionId(sipRequest);
                    return [4 /*yield*/, socket.write(sipRequest)];
                case 1:
                    writeSuccess = _a.sent();
                    if (!writeSuccess) {
                        if (!!errorLogger.onRequestNotSent) {
                            errorLogger.onRequestNotSent(methodName, params, socket);
                        }
                        socket.destroy(mkDestroyMsg("write did not return true (request not sent)"));
                        throw new SendRequestError(methodName, params, "CANNOT SEND REQUEST");
                    }
                    timeoutValue = extra.timeout || 5 * 60 * 1000;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    ctx_1 = evt_1.Evt.newCtx();
                    return [4 /*yield*/, Promise.race([
                            socket.evtRequest.attachOnceExtract(function (sipRequestResponse) { return ApiMessage_1.ApiMessage.Response.matchSip(sipRequestResponse, actionId); }, ctx_1, timeoutValue, function () { return ctx_1.done(); }),
                            new Promise(function (_, reject) { return socket.evtClose.attachOnce(ctx_1, function () {
                                ctx_1.done();
                                reject(new Error("CLOSE"));
                            }); })
                        ])];
                case 3:
                    sipRequestResponse = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    sendRequestError = new SendRequestError(methodName, params, (error_1.message === "CLOSE") ?
                        "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT");
                    if (sendRequestError.cause === "REQUEST TIMEOUT") {
                        if (!!errorLogger.onRequestTimeout) {
                            errorLogger.onRequestTimeout(methodName, params, timeoutValue, socket);
                        }
                        socket.destroy(mkDestroyMsg("Request timed out"));
                    }
                    else {
                        if (!!errorLogger.onClosedConnection) {
                            errorLogger.onClosedConnection(methodName, params, socket);
                        }
                    }
                    throw sendRequestError;
                case 5:
                    try {
                        response = ApiMessage_1.ApiMessage.parsePayload(sipRequestResponse, extra.sanityCheck);
                    }
                    catch (_b) {
                        sendRequestError = new SendRequestError(methodName, params, "MALFORMED RESPONSE");
                        sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;
                        if (!!errorLogger.onMalformedResponse) {
                            errorLogger.onMalformedResponse(methodName, params, misc.getPacketContent(sipRequestResponse), socket);
                        }
                        socket.destroy("Response is malformed");
                        throw sendRequestError;
                    }
                    return [2 /*return*/, response];
            }
        });
    });
}
exports.sendRequest = sendRequest;
function enableErrorLogging(socket, errorLogger) {
    socket.misc[enableErrorLogging.miscKey] = errorLogger;
}
exports.enableErrorLogging = enableErrorLogging;
(function (enableErrorLogging) {
    enableErrorLogging.miscKey = " __api_client_error_logger__ ";
})(enableErrorLogging = exports.enableErrorLogging || (exports.enableErrorLogging = {}));
function enableKeepAlive(socket, interval) {
    var _this = this;
    if (interval === void 0) { interval = 120 * 1000; }
    var methodName = ApiMessage_1.keepAlive.methodName;
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var whereTimerDelayed, _a, before, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!!socket.evtConnect.postCount) return [3 /*break*/, 2];
                    return [4 /*yield*/, socket.evtConnect.waitFor()];
                case 1:
                    _c.sent();
                    _c.label = 2;
                case 2:
                    whereTimerDelayed = false;
                    _c.label = 3;
                case 3:
                    if (!true) return [3 /*break*/, 12];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, sendRequest(socket, methodName, "PING", {
                            //"timeout": 5 * 1000,
                            "timeout": (function () {
                                if (!whereTimerDelayed) {
                                    return 5 * 1000;
                                }
                                whereTimerDelayed = false;
                                return 500;
                            })(),
                            "sanityCheck": function (response) { return response === "PONG"; }
                        })];
                case 5:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 6:
                    _a = _c.sent();
                    return [3 /*break*/, 12];
                case 7:
                    before = Date.now();
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, socket.evtClose.waitFor(interval)];
                case 9:
                    _c.sent();
                    return [3 /*break*/, 12];
                case 10:
                    _b = _c.sent();
                    return [3 /*break*/, 11];
                case 11:
                    if (Math.abs(Date.now() - before - interval) > 500) {
                        /*NOTE: If the timeout was delayed ( happens when react-native app in background on android )
                        we want to quickly see if the connection is still usable so next ping we send we do not
                        wait 5 second for the server to respond, if the server did not responded "PONG" within the
                        next 0.5 second we close the connection.
                        */
                        whereTimerDelayed = true;
                    }
                    return [3 /*break*/, 3];
                case 12: return [2 /*return*/];
            }
        });
    }); })();
}
exports.enableKeepAlive = enableKeepAlive;
var SendRequestError = /** @class */ (function (_super) {
    __extends(SendRequestError, _super);
    function SendRequestError(methodName, params, cause) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, "Send request " + methodName + " " + cause) || this;
        _this.methodName = methodName;
        _this.params = params;
        _this.cause = cause;
        _this.misc = {};
        setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return SendRequestError;
}(Error));
exports.SendRequestError = SendRequestError;
function getDefaultErrorLogger(options) {
    options = options || {};
    var idString = options.idString || "";
    var log = options.log || console.log.bind(console);
    var base = function (socket, methodName, params) { return [
        ("[ Sip API " + idString + " call Error ]").red,
        methodName,
        socket.localAddress + ":" + socket.localPort + " (local)",
        "=>",
        socket.remoteAddress + ":" + socket.remotePort + " (remote)",
        "\n",
        "params: " + JSON.stringify(params) + "\n",
    ].join(" "); };
    return {
        "onRequestNotSent": function (methodName, params, socket) {
            return log(base(socket, methodName, params) + "Request not sent");
        },
        "onClosedConnection": function (methodName, params, socket) {
            return log(base(socket, methodName, params) + "Remote connection lost");
        },
        "onRequestTimeout": function (methodName, params, timeoutValue, socket) {
            return log(base(socket, methodName, params) + "Request timeout after " + timeoutValue + "ms");
        },
        "onMalformedResponse": function (methodName, params, rawResponse, socket) {
            return log(base(socket, methodName, params) + "Malformed response\nrawResponse: " + rawResponse);
        }
    };
}
exports.getDefaultErrorLogger = getDefaultErrorLogger;
