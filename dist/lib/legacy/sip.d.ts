/** Trim from sip.js project */
declare function parseAOR(data: any): any;
export { parseAOR };
declare function parseUri(s: any): any;
export { parseUri };
declare function stringifyUri(uri: any): string;
export { stringifyUri };
declare function stringifyAuthHeader(a: any): string;
export { stringifyAuthHeader };
declare function stringify(m: any): any;
export { stringify };
/**
 *
 * @param onMessage: (sipPacket: types.Packet) => void
 * @param onFlood?: (dataAsBinaryString: string, floodType: "HEADERS" | "CONTENT")=> void
 * @param maxBytesHeaders?: number
 * @param maxContentLength?: number
 *
 * return (dataAsBinaryString: string)=> void;
 *
 * if onFlood is undefined no flood detection will be enabled.
 *
 */
declare function makeStreamParser(onMessage: any, onFlood?: any, maxBytesHeaders?: any, maxContentLength?: any): (data: any) => void;
export { makeStreamParser };
/** Can throw, can return undefined */
declare function parseMessage(s: any): any;
export { parseMessage as parse };
declare function checkMessage(msg: any): any;
export { checkMessage };
declare function generateBranch(): string;
export { generateBranch };
