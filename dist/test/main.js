"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rejection-tracker").main(__dirname, "..", "..");
var sipLibrary = require("../lib");
var testing_1 = require("transfer-tools/dist/lib/testing");
//Copy paste from semasimGateway sipProxy misc
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
/**
 * Return true if it's a sipRequest originated of UA
 * or if it's a sipResponse of a request originated by UA.
 * */
function isRequestFromClient(sipPacket) {
    return sipPacket.headers.via[sipPacket.headers.via.length - 1].protocol !== "TCP";
}
function readImsi(sipPacket) {
    return sipLibrary.parseUri(sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].uri).user.match(/^([0-9]{15})/)[1];
}
var cid;
(function (cid) {
    var _a = stringTransform.transcode("base64", { "=": "_" }), enc = _a.enc, dec = _a.dec;
    /** on backend on client connection */
    function generate(clientSocket, timestamp) {
        if (timestamp === void 0) { timestamp = Date.now(); }
        return enc(timestamp + ":" + clientSocket.remoteAddress + ":" + clientSocket.remotePort);
    }
    cid.generate = generate;
    function parse(connectionId) {
        var _a = dec(connectionId).split(":"), a = _a[0], b = _a[1], c = _a[2];
        return {
            "timestamp": parseInt(a),
            "clientSocketRemoteAddress": b,
            "clientSocketRemotePort": parseInt(c)
        };
    }
    cid.parse = parse;
    var key = "connection_id";
    /** To set on request from asteriskSocket (gw) and from clientSocket (backend) */
    function set(sipRequestNextHop, connectionId) {
        sipRequestNextHop.headers[isRequestFromClient(sipRequestNextHop) ? "from" : "to"].params[key] = connectionId;
    }
    cid.set = set;
    /** read when ever we need to root a packet */
    function read(sipPacket) {
        return sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].params[key];
    }
    cid.read = read;
})(cid || (cid = {}));
//Beginning of the actual tests.
var asteriskSocket = {
    "protocol": "TCP",
    "localPort": 1111,
    "localAddress": "__gateway__"
};
var backendSocket = {
    "protocol": "TLS",
    "localPort": 2222,
    "localAddress": "__gateway__"
};
var gatewaySocket = {
    "protocol": "TLS",
    "localPort": 80,
    "localAddress": "__backend_2__"
};
var clientSocket = {
    "protocol": "WSS",
    "localPort": 443,
    "localAddress": "__backend_1__",
    "remoteAddress": "__client__",
    "remotePort": 3333
};
var date_now = 1519292655023;
var imsi = "208150113995832";
var connectionId = cid.generate(clientSocket, date_now);
testing_1.assertSame(cid.parse(connectionId), {
    "timestamp": date_now,
    "clientSocketRemoteAddress": clientSocket.remoteAddress,
    "clientSocketRemotePort": clientSocket.remotePort
});
function asteriskInitRequest() {
    var sipRequest_A = sipLibrary.parse(Buffer.from([
        "INVITE sip:" + imsi + "@semasim.com;connection_id=" + connectionId + " SIP/2.0",
        "Via: SIP/2.0/TCP " + asteriskSocket.localAddress + ":5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=" + connectionId + ">",
        "Contact:  <sip:asterisk@192.168.0.60:5060;transport=TCP>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Max-Forwards: 70",
        "Content-Length: 0",
        "Route:  " + [
            "<sip:" + asteriskSocket.localAddress + ":" + asteriskSocket.localPort + ";transport=" + asteriskSocket.protocol + ";lr>",
            "<sip:" + gatewaySocket.localAddress + ":" + gatewaySocket.localPort + ";transport=" + gatewaySocket.protocol + ";lr>"
        ].join(",  "),
        "\r\n",
    ].join("\r\n"), "utf8"));
    console.log("sipRequest_A:");
    console.log(sipLibrary.stringify(sipRequest_A));
    testing_1.assertSame(readImsi(sipRequest_A), imsi);
    var sipRequest_B = sipLibrary.buildNextHopPacket(backendSocket, sipRequest_A);
    cid.set(sipRequest_B, connectionId);
    console.log("sipRequest_B:");
    console.log(sipLibrary.stringify(sipRequest_B));
    testing_1.assertSame(sipRequest_B, sipLibrary.parse(Buffer.from([
        "INVITE sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_ SIP/2.0",
        "Via: SIP/2.0/TLS __gateway__:2222;branch=z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_",
        "Contact:  <sip:asterisk@192.168.0.60:5060;transport=TCP>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Max-Forwards: 69",
        "Content-Length: 0",
        "Route:  <sip:__backend_2__:80;transport=TLS;lr>",
        "Record-Route:  <sip:__gateway__:2222;transport=TLS;lr>",
        "\r\n"
    ].join("\r\n"), "utf8")));
    testing_1.assertSame(cid.read(sipRequest_B), connectionId);
    var sipRequest_C = sipLibrary.buildNextHopPacket(clientSocket, sipRequest_B);
    console.log("sipRequest_C:");
    console.log(sipLibrary.stringify(sipRequest_C));
    testing_1.assertSame(sipRequest_C, sipLibrary.parse(Buffer.from([
        "INVITE sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_ SIP/2.0",
        "Via: SIP/2.0/WSS __backend_1__:443;branch=z9hG4bK-z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TLS __gateway__:2222;branch=z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_",
        "Contact:  <sip:asterisk@192.168.0.60:5060;transport=TCP>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Max-Forwards: 68",
        "Content-Length: 0",
        "Record-Route: <sip:__backend_1__:443;transport=WSS;lr>",
        "Record-Route: <sip:__gateway__:2222;transport=TLS;lr>",
        "\r\n"
    ].join("\r\n"), "utf8")));
    var sipResponse_d = sipLibrary.parse(Buffer.from([
        "SIP/2.0 180 Ringing",
        "\r\n"
    ].join("\r\n"), "utf8"));
    sipResponse_d.headers = sipLibrary.clonePacket(sipRequest_C).headers;
    sipResponse_d.headers.to.params["tag"] = "8117gmpdpl";
    sipResponse_d.headers.contact[0].uri = "sip:" + imsi + "@semasim.com";
    delete sipResponse_d.headers["max-forwards"];
    console.log("sipResponse_d:");
    console.log(sipLibrary.stringify(sipResponse_d));
    testing_1.assertSame(readImsi(sipResponse_d), imsi);
    var sipResponse_e = sipLibrary.buildNextHopPacket(gatewaySocket, sipResponse_d);
    console.log("sipResponse_e:");
    console.log(sipLibrary.stringify(sipResponse_e));
    testing_1.assertSame(sipResponse_e, sipLibrary.parse(Buffer.from([
        "SIP/2.0 180 Ringing",
        "Via: SIP/2.0/TLS __gateway__:2222;branch=z9hG4bK-z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;rport",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_;tag=8117gmpdpl",
        "Contact:  <sip:208150113995832@semasim.com>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Content-Length: 0",
        "Record-Route: <sip:__backend_2__:80;transport=TLS;lr>",
        "Record-Route: <sip:__gateway__:2222;transport=TLS;lr>",
        "\r\n"
    ].join("\r\n"), "utf8")));
    testing_1.assertSame([readImsi, cid.read].map(function (f) { return f(sipResponse_e); }), [imsi, connectionId]);
    var sipResponse_f = sipLibrary.buildNextHopPacket(asteriskSocket, sipResponse_e);
    console.log("sipResponse_f:");
    console.log(sipLibrary.stringify(sipResponse_f));
    testing_1.assertSame(sipResponse_f, sipLibrary.parse(Buffer.from([
        "SIP/2.0 180 Ringing",
        "Via: SIP/2.0/TCP __gateway__:5060;rport;branch=z9hG4bKPj43df2c0d-b1ad-42d6-923d-93c9b65afb18;alias",
        "From:  <sip:0636786385@semasim.com>;tag=65142128-e2c1-4cfd-a6d7-ee4dcfe5d433",
        "To:  <sip:208150113995832@semasim.com;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_>;connection_id=MTUxOTI5MjY1NTAyMzpfX2NsaWVudF9fOjMzMzM_;tag=8117gmpdpl",
        "Contact:  <sip:208150113995832@semasim.com>",
        "Call-ID: 9e3b5bf1-42ff-4755-81ba-2b3cd1266504",
        "Content-Length: 0",
        "Record-Route: <sip:__backend_2__:80;transport=TLS;lr>",
        "Record-Route: <sip:__gateway__:1111;transport=TCP;lr>",
        "\r\n"
    ].join("\r\n"), "utf8")));
    console.assert(sipLibrary.isResponse(sipRequest_A, sipResponse_f));
    console.assert(sipLibrary.isResponse(sipRequest_B, sipResponse_e));
    console.assert(sipLibrary.isResponse(sipRequest_C, sipResponse_d));
    console.log("PASS " + asteriskInitRequest.name);
}
function clientInitRequest() {
    console.log("TODO " + clientInitRequest.name);
}
function clientInitRequestRegister() {
    console.log("TODO " + clientInitRequestRegister.name);
}
asteriskInitRequest();
clientInitRequest();
clientInitRequestRegister();
console.log("PASS SIP LIBRARY !");
