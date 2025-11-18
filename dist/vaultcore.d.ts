import { type Options } from 'ky';
export type ResponseType = 'json' | 'text' | 'arrayBuffer';
export interface VaultcoreClientOptions {
    baseUrl: string;
    accessToken: string;
    kyOptions?: Options;
}
export declare class VaultcoreClient {
    private readonly baseUrl;
    private readonly accessToken;
    private readonly base;
    constructor(options: VaultcoreClientOptions);
    getObject(key: string, responseType?: ResponseType): Promise<unknown>;
    putObject(key: string, data: unknown, contentType?: string): Promise<unknown>;
    postObject(key: string, data: unknown, contentType?: string): Promise<unknown>;
    deleteObject(key: string): Promise<unknown>;
}
export default VaultcoreClient;
//# sourceMappingURL=vaultcore.d.ts.map