"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("./core/sip");
var _sdp_ = require("./core/sdp");
function makeStreamParser(handler, floodHandler) {
    var streamParser = (function () {
        if (!floodHandler) {
            return sip.makeStreamParser(handler);
        }
        else {
            var onFlood_1 = floodHandler.onFlood, maxBytesHeaders_1 = floodHandler.maxBytesHeaders, maxContentLength_1 = floodHandler.maxContentLength;
            return sip.makeStreamParser(handler, function (dataAsBinaryStr, floodType) { return onFlood_1(new makeStreamParser.FloodError(floodType, Buffer.from(dataAsBinaryStr, "binary"), maxBytesHeaders_1, maxContentLength_1)); }, maxBytesHeaders_1, maxContentLength_1);
        }
    })();
    return function (data) { return streamParser(data.toString("binary")); };
}
exports.makeStreamParser = makeStreamParser;
(function (makeStreamParser) {
    var FloodError = /** @class */ (function (_super) {
        __extends(FloodError, _super);
        function FloodError(floodType, data, maxBytesHeaders, maxContentLength) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, (function () {
                switch (floodType) {
                    case "HEADERS":
                        return "Sip Headers length > " + maxBytesHeaders + " Bytes";
                    case "CONTENT":
                        return "Sip content length > " + maxContentLength + " Bytes";
                }
            })()) || this;
            _this.floodType = floodType;
            _this.data = data;
            _this.maxBytesHeaders = maxBytesHeaders;
            _this.maxContentLength = maxContentLength;
            Object.setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        FloodError.prototype.toString = function () {
            return [
                "SIP Socket flood: " + this.message,
                "cause: " + this.floodType,
                "data ( as binary string ): >" + this.data.toString("binary") + "<"
            ].join("\n");
        };
        return FloodError;
    }(Error));
    makeStreamParser.FloodError = FloodError;
})(makeStreamParser = exports.makeStreamParser || (exports.makeStreamParser = {}));
function toData(sipPacket) {
    var dataAsBinaryString = sip.stringify(sipPacket);
    return Buffer.from(dataAsBinaryString, "binary");
}
exports.toData = toData;
//** Can throw */
exports.parse = function (data) {
    var sipPacket = sip.parse(data.toString("binary"));
    if (!sipPacket) {
        throw new Error("Can't parse SIP packet");
    }
    return sipPacket;
};
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;
