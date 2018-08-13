import * as types from "../types";
export declare const sipMethodName = "API";
export declare namespace ApiMessage {
    function buildSip(actionId: number, payload: any): types.Request;
    function matchSip(sipRequest: types.Request): boolean;
    function readActionId(sipRequest: types.Request): number;
    function parsePayload(sipRequest: types.Request, sanityCheck?: (payload: any) => boolean): any;
    namespace Request {
        function buildSip(methodName: string, params: any): types.Request;
        function matchSip(sipRequest: types.Request): boolean;
        function readMethodName(sipRequest: types.Request): string;
    }
    namespace Response {
        function buildSip(actionId: number, response: any): types.Request;
        function matchSip(sipRequest: types.Request, actionId: number): boolean;
    }
}
export declare namespace keepAlive {
    const methodName = "__keepAlive__";
    type Params = "PING";
    type Response = "PONG";
}
