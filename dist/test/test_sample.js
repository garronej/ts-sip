"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sipLibrary = require("../lib");
var fs = require("fs");
var path = require("path");
var data = fs.readFileSync(path.join(__dirname, "..", "..", "res", "sip_messages"));
var streamParser = sipLibrary.makeStreamParser(function (sipPacket) {
    console.log("sipPacket!");
}, function onFlood(_data, floodType) {
    console.assert(false, "FLOOD! " + floodType);
}, sipLibrary.Socket.maxBytesHeaders, sipLibrary.Socket.maxContentLength);
for (var _i = 0, _a = data.toString("utf8").split(""); _i < _a.length; _i++) {
    var char = _a[_i];
    streamParser(Buffer.from(char, "utf8"));
}
console.log("PASS char by char");
streamParser(data);
console.log("PASS full buffer");
