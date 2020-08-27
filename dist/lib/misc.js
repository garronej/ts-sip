"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNextHopPacket = exports.isResponse = exports.getContact = exports.filterSdpCandidates = exports.addOptionTag = exports.hasOptionTag = exports.parseOptionTags = exports.stringifyPath = exports.parsePath = exports.isPlainMessageRequest = exports.readSrflxAddrInSdp = exports.getPacketContent = exports.setPacketContent = exports.clonePacket = exports.matchRequest = exports.stringify = void 0;
var core = require("./core");
//export const regIdKey = "reg-id";
//export const instanceIdKey = "+sip.instance";
/** For debug purpose only, assume sipPacket content is UTF-8 encoded text */
function stringify(sipPacket) {
    return core.toData(sipPacket).toString("utf8");
}
exports.stringify = stringify;
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
function clonePacket(sipPacket) {
    return core.parse(core.toData(sipPacket));
}
exports.clonePacket = clonePacket;
function setPacketContent(sipPacket, data) {
    if (typeof data === "string") {
        data = Buffer.from(data, "utf8");
    }
    sipPacket.headers["content-length"] = data.byteLength;
    sipPacket.content = data.toString("binary");
}
exports.setPacketContent = setPacketContent;
/** Get the RAW content as buffer */
function getPacketContent(sipPacket) {
    return Buffer.from(sipPacket.content, "binary");
}
exports.getPacketContent = getPacketContent;
function readSrflxAddrInSdp(sdp) {
    var e_1, _a, e_2, _b;
    try {
        for (var _c = __values(core.parseSdp(sdp).m), _d = _c.next(); !_d.done; _d = _c.next()) {
            var m_i = _d.value;
            if (m_i.media !== "audio")
                continue;
            try {
                for (var _e = (e_2 = void 0, __values(m_i.a)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var a_i = _f.value;
                    var match = a_i.match(/^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/);
                    if (match)
                        return match[1];
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return undefined;
}
exports.readSrflxAddrInSdp = readSrflxAddrInSdp;
function isPlainMessageRequest(sipRequest, withAuth) {
    var _a;
    if (withAuth === void 0) { withAuth = undefined; }
    return (sipRequest.method === "MESSAGE" &&
        (!withAuth || "authorization" in sipRequest.headers) &&
        !!((_a = sipRequest.headers["content-type"]) === null || _a === void 0 ? void 0 : _a.toLowerCase().match(/^text\/plain/)));
}
exports.isPlainMessageRequest = isPlainMessageRequest;
function parsePath(path) {
    var message = core.parse(Buffer.from([
        "DUMMY _ SIP/2.0",
        "Path: " + path,
        "\r\n"
    ].join("\r\n"), "utf8"));
    return message.headers.path;
}
exports.parsePath = parsePath;
function stringifyPath(parsedPath) {
    var message = core.parse(Buffer.from([
        "DUMMY _ SIP/2.0",
        "\r\n"
    ].join("\r\n"), "utf8"));
    message.headers.path = parsedPath;
    return core.toData(message).toString("utf8").match(/\r\nPath:\ +(.*)\r\n/)[1];
}
exports.stringifyPath = stringifyPath;
function parseOptionTags(headerFieldValue) {
    if (!headerFieldValue) {
        return [];
    }
    return headerFieldValue.split(",").map(function (optionTag) { return optionTag.replace(/\s/g, ""); });
}
exports.parseOptionTags = parseOptionTags;
function hasOptionTag(headers, headerField, optionTag) {
    var headerFieldValue = headers[headerField];
    var optionTags = parseOptionTags(headerFieldValue);
    return optionTags.indexOf(optionTag) >= 0;
}
exports.hasOptionTag = hasOptionTag;
/** Do nothing if already present */
function addOptionTag(headers, headerField, optionTag) {
    if (hasOptionTag(headers, headerField, optionTag)) {
        return;
    }
    var optionTags = parseOptionTags(headers[headerField]);
    optionTags.push(optionTag);
    headers[headerField] = optionTags.join(", ");
}
exports.addOptionTag = addOptionTag;
function filterSdpCandidates(keep, sdp) {
    var e_3, _a;
    var shouldKeepCandidate = function (candidateLine) {
        return ((keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/)));
    };
    var parsedSdp = core.parseSdp(sdp);
    var arr = parsedSdp.m[0].a;
    try {
        for (var _b = __values(__spread(arr)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var line = _c.value;
            if (!line.match(/^candidate/))
                continue;
            if (!shouldKeepCandidate(line)) {
                arr.splice(arr.indexOf(line), 1);
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return core.stringifySdp(sdp);
}
exports.filterSdpCandidates = filterSdpCandidates;
function getContact(sipRequest) {
    if (!sipRequest.headers.contact || !sipRequest.headers.contact.length) {
        return undefined;
    }
    return sipRequest.headers.contact[0];
}
exports.getContact = getContact;
function isResponse(sipRequestNextHop, sipResponse) {
    return sipResponse.headers.via[0].params["branch"] ===
        sipRequestNextHop.headers.via[0].params["branch"];
}
exports.isResponse = isResponse;
function buildNextHopPacket(socket, sipPacketAsReceived) {
    var sipPacketNextHop = clonePacket(sipPacketAsReceived);
    if (matchRequest(sipPacketNextHop)) {
        var sipRequestNextHop = sipPacketNextHop;
        buildNextHopPacket.popRoute(sipRequestNextHop);
        if (sipRequestNextHop.method === "REGISTER") {
            var sipRequestRegister = sipRequestNextHop;
            buildNextHopPacket.pushPath(socket, sipRequestRegister);
        }
        else {
            if (getContact(sipRequestNextHop)) {
                buildNextHopPacket.pushRecordRoute(socket, sipRequestNextHop);
            }
        }
        buildNextHopPacket.pushVia(socket, sipRequestNextHop);
        buildNextHopPacket.decrementMaxForward(sipRequestNextHop);
    }
    else {
        var sipResponseNextHop = sipPacketNextHop;
        buildNextHopPacket.rewriteRecordRoute(socket, sipResponseNextHop);
        buildNextHopPacket.popVia(sipResponseNextHop);
    }
    return sipPacketNextHop;
}
exports.buildNextHopPacket = buildNextHopPacket;
/** pop and shift refer to stack operations */
(function (buildNextHopPacket) {
    function buildLocalAoRWithParsedUri(socket) {
        return {
            "uri": __assign(__assign({}, core.parseUri("sip:" + socket.localAddress + ":" + socket.localPort)), { "params": {
                    "transport": socket.protocol,
                    "lr": null
                } }),
            "params": {}
        };
    }
    function popRoute(sipRequest) {
        if (!sipRequest.headers.route) {
            return;
        }
        sipRequest.headers.route.shift();
        //For tests
        if (!sipRequest.headers.route.length) {
            delete sipRequest.headers.route;
        }
    }
    buildNextHopPacket.popRoute = popRoute;
    function pushPath(socket, sipRequestRegister) {
        addOptionTag(sipRequestRegister.headers, "supported", "path");
        if (!sipRequestRegister.headers.path) {
            sipRequestRegister.headers.path = [];
        }
        sipRequestRegister.headers.path.unshift(buildLocalAoRWithParsedUri(socket));
    }
    buildNextHopPacket.pushPath = pushPath;
    function pushRecordRoute(socket, sipRequest) {
        if (!sipRequest.headers["record-route"]) {
            sipRequest.headers["record-route"] = [];
        }
        sipRequest.headers["record-route"].unshift(buildLocalAoRWithParsedUri(socket));
    }
    buildNextHopPacket.pushRecordRoute = pushRecordRoute;
    function pushVia(socket, sipRequest) {
        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": socket.protocol,
            "host": socket.localAddress,
            "port": socket.localPort,
            "params": {
                "branch": (function () {
                    var via = sipRequest.headers.via;
                    return via.length ? "z9hG4bK-" + via[0].params["branch"] : core.generateBranch();
                })(),
                "rport": null
            }
        });
    }
    buildNextHopPacket.pushVia = pushVia;
    function popVia(sipResponse) {
        sipResponse.headers.via.shift();
    }
    buildNextHopPacket.popVia = popVia;
    /** Need to be called before Via is poped */
    function rewriteRecordRoute(socket, sipResponse) {
        var recordRoute = sipResponse.headers["record-route"];
        if (recordRoute) {
            recordRoute[recordRoute.length - sipResponse.headers.via.length + 1] = buildLocalAoRWithParsedUri(socket);
        }
    }
    buildNextHopPacket.rewriteRecordRoute = rewriteRecordRoute;
    function decrementMaxForward(sipRequest) {
        var maxForwards = parseInt(sipRequest.headers["max-forwards"]);
        if (isNaN(maxForwards)) {
            throw new Error("Max-Forwards not defined");
        }
        sipRequest.headers["max-forwards"] = "" + (maxForwards - 1);
    }
    buildNextHopPacket.decrementMaxForward = decrementMaxForward;
})(buildNextHopPacket = exports.buildNextHopPacket || (exports.buildNextHopPacket = {}));
