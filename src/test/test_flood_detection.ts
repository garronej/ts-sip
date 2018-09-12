process.once("unhandledRejection", error => { throw error; });

import * as sipLibrary from "../lib";
import * as fs from "fs";
import * as path from "path";

{

    const data = fs.readFileSync(path.join(__dirname, "..", "..", "res", "sip_messages"));

    const streamParser = sipLibrary.makeStreamParser(
        () => console.log("sipPacket!"),
        {
            "onFlood": floodError => console.assert(false, floodError.toString()),
            "maxBytesHeaders": sipLibrary.Socket.maxBytesHeaders,
            "maxContentLength": sipLibrary.Socket.maxContentLength
        }
    );

    for (const char of data.toString("utf8").split("")) {

        streamParser(Buffer.from(char, "utf8"));

    }

    console.log("PASS char by char");

    streamParser(data);

    console.log("PASS full buffer");

}

{

    const data = Buffer.from((new Array(1111111)).fill("x").join(""), "utf8");

    const streamParser = sipLibrary.makeStreamParser(
        () => console.assert(false, "packet parsed :("),
        {
            "onFlood": floodError => {

                console.log("Flood detected");

            },
            "maxBytesHeaders": sipLibrary.Socket.maxBytesHeaders,
            "maxContentLength": sipLibrary.Socket.maxContentLength
        }
    );

    streamParser(data);

    console.log("PASS FLOOD DETECTION");


}
