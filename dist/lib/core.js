"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("sip");
var _sdp_ = require("sip/sdp");
function makeStreamParser(handler, onFlood, maxBytesHeaders, maxContentLength) {
    var streamParser = sip.makeStreamParser(handler, function (dataAsBinaryStr, floodType) { return onFlood(Buffer.from(dataAsBinaryStr, "binary"), floodType); }, maxBytesHeaders, maxContentLength);
    return function (data) { return streamParser(data.toString("binary")); };
}
exports.makeStreamParser = makeStreamParser;
function toData(sipPacket) {
    var dataAsBinaryString = sip.stringify(sipPacket);
    if (!!sipPacket.headers["record-route"]) {
        var split = dataAsBinaryString.split("\r\n");
        for (var i = 0; i < split.length; i++) {
            var match = split[i].match(/^Record-Route:(.+)$/);
            if (match) {
                split[i] = match[1]
                    .replace(/\s/g, "")
                    .split(",")
                    .map(function (v) { return "Record-Route: " + v; })
                    .join("\r\n");
                break;
            }
        }
        dataAsBinaryString = split.join("\r\n");
    }
    return Buffer.from(dataAsBinaryString, "binary");
}
exports.toData = toData;
exports.parse = function (data) {
    var sipPacket = sip.parse(data.toString("binary"));
    if (!sipPacket.headers.via) {
        sipPacket.headers.via = [];
    }
    return sipPacket;
};
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;
