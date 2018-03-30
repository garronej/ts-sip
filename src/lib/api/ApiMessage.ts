import * as types from "../types";
import * as core from "../core";
import * as misc from "../misc";
import { JSON_CUSTOM as ttJC } from "transfer-tools";

const JSON_CUSTOM = ttJC.get();

export const sipMethodName= "API";

export namespace ApiMessage {

    const actionIdKey = "api-action-id";

    export function buildSip(
        actionId: number,
        payload: any
    ): types.Request {

        let sipRequest = core.parse(Buffer.from([
            `${sipMethodName} _ SIP/2.0`,
            "Max-Forwards: 0",
            "\r\n"
        ].join("\r\n"), "utf8")) as types.Request;

        sipRequest.headers[actionIdKey] = `${actionId++}`;

        console.assert(payload !== null, "null is not stringifiable");
        console.assert(!(typeof payload === "number" && isNaN(payload)), "NaN is not stringifiable");

        misc.setPacketContent(
            sipRequest,
            JSON_CUSTOM.stringify(payload)
        );

        return sipRequest;

    }

    export function matchSip(sipRequest: types.Request): boolean {
        return (
            !!sipRequest.headers &&
            !isNaN(parseInt(sipRequest.headers[actionIdKey]))
        );
    }

    export function readActionId(sipRequest: types.Request): number {
        return parseInt(sipRequest.headers[actionIdKey]);
    }

    export function parsePayload(
        sipRequest: types.Request,
        sanityCheck?: (payload: any) => boolean
    ): any {

        let payload = JSON_CUSTOM.parse(
            misc.getPacketContent(sipRequest).toString("utf8")
        );

        console.assert(!sanityCheck || sanityCheck(payload));

        return payload;

    }

    const methodNameKey = "method";

    export namespace Request {

        let actionIdCounter = 0;

        export function buildSip(
            methodName: string,
            params: any,
        ) {

            let sipRequest = ApiMessage.buildSip(actionIdCounter++, params);

            sipRequest.headers[methodNameKey] = methodName;

            return sipRequest;

        }

        export function matchSip(
            sipRequest: types.Request
        ): boolean {
            return (
                ApiMessage.matchSip(sipRequest) &&
                !!sipRequest.headers[methodNameKey]
            );
        }

        export function readMethodName(sipRequest: types.Request): string {
            return sipRequest.headers[methodNameKey];
        }


    }

    export namespace Response {

        export function buildSip(
            actionId: number,
            response: any,
        ) {

            let sipRequest = ApiMessage.buildSip(actionId, response);

            return sipRequest;

        }

        export function matchSip(
            sipRequest: types.Request,
            actionId: number
        ): boolean {
            return (
                ApiMessage.matchSip(sipRequest) &&
                sipRequest.headers[methodNameKey] === undefined &&
                ApiMessage.readActionId(sipRequest) === actionId
            );
        }


    }

}

export namespace keepAlive {

    export const methodName = "__keepAlive__";

    export type Params = "PING";

    export type Response = "PONG";

}
