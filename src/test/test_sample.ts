process.once("unhandledRejection", error => { throw error; });

import * as sipLibrary from "../lib";
import * as fs from "fs";
import * as path from "path";

const data = fs.readFileSync(path.join(__dirname, "..", "..", "res", "sip_messages"));

const streamParser= sipLibrary.makeStreamParser(sipPacket => {

    console.log("sipPacket!");

},
    function onFlood(floodError) {

        console.assert(false, floodError.toString());

    },
    sipLibrary.Socket.maxBytesHeaders,
    sipLibrary.Socket.maxContentLength
);

for( const char of data.toString("utf8").split("") ){

    streamParser(Buffer.from(char,"utf8"));

}

console.log("PASS char by char");

streamParser(data);

console.log("PASS full buffer");
