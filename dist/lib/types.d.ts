export declare type TransportProtocol = "TCP" | "UDP" | "TLS" | "WSS";
export interface Via {
    version: string;
    protocol: string;
    host: string;
    port: number;
    params: Record<string, string | null>;
}
export interface ParsedUri {
    schema: string;
    user: string | undefined;
    password: string | undefined;
    host: string | undefined;
    port: number;
    params: Record<string, string | null>;
    headers: Record<string, string>;
}
export declare type AoR = {
    name: string | undefined;
    uri: string;
    params: Record<string, string | null>;
};
export declare type AoRWithParsedUri = {
    uri: ParsedUri;
    params: Record<string, string | null>;
};
export declare type Headers = {
    via: Via[];
    from: AoR;
    to: AoR;
    cseq: {
        seq: number;
        method: string;
    };
    contact?: AoR[];
    path?: AoRWithParsedUri[];
    route?: AoRWithParsedUri[];
    "record-route"?: AoRWithParsedUri[];
    [key: string]: string | any;
};
export interface PacketBase {
    uri: string;
    version: string;
    headers: Headers;
    content: string;
}
export interface Request extends PacketBase {
    method: string;
}
export interface Response extends PacketBase {
    status: number;
    reason: string;
}
export declare type Packet = Request | Response;
