import { promises as fs, statSync } from 'node:fs';
import path from 'node:path';
import { Builtins, Cli, Command, Option } from 'clipanion';
import dotenv from 'dotenv';
import ky, { type KyInstance, type Options } from 'ky';
import packageJson from './package.json' with { type: 'json' };

const { version } = packageJson;

dotenv.config({ quiet: true });

try {
  statSync('vaultcore.env');
  dotenv.config({ path: path.join(process.cwd(), 'vaultcore.env'), quiet: true });
} catch (_) {
  // ignore
}

try {
  statSync('envrepo.env');
  dotenv.config({ path: path.join(process.cwd(), 'envrepo.env'), quiet: true });
} catch (_) {
  // ignore
}

export type ResponseType = 'json' | 'text' | 'arrayBuffer';

export interface VaultcoreClientOptions {
  baseUrl: string;
  accessToken: string;
  kyOptions?: Options;
}

const errorHandler = async ({response}) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true }); // Decode chunks
  }
  console.error(result);
  process.exit(1);
};

export class VaultcoreClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly base: KyInstance;

  constructor(options: VaultcoreClientOptions) {
    const { baseUrl, accessToken, kyOptions } = options;
    const normalizedBaseUrl = (() => {
      let url = baseUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      return url.replace(/\/$/, '');
    })();

    this.baseUrl = normalizedBaseUrl;
    this.accessToken = accessToken;

    const finalOptions = {
      prefixUrl: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      ...kyOptions,
    };

    this.base = ky.create(finalOptions);
  }

  async getObject(key: string, responseType: ResponseType = 'arrayBuffer') {
    try {
      const url = encodeURIComponent(key).replace(/%2F/g, '/');
      const res = this.base.get(url);
      switch (responseType) {
        case 'json':
          return res.json();
        case 'text':
          return res.text();
        default:
          return res.arrayBuffer();
      }
    } catch (error) {
      console.error('GET failed', error);
      throw new Error(`GET failed: ${error}`);
    }
  }

  async putObject(key: string, data: unknown, contentType?: string) {
    try {
      const url = encodeURIComponent(key).replace(/%2F/g, '/');
      const headers: Record<string, string> = {};

      let body: BodyInit;
      if (typeof data === 'string') {
        body = new Blob([data], { type: contentType || 'text/plain; charset=utf-8' });
      } else if (data instanceof Blob) {
        body = data;
        if (contentType) headers['Content-Type'] = contentType;
      } else if (data instanceof ArrayBuffer) {
        body = new Blob([data], { type: contentType || 'application/octet-stream' });
      } else {
        body = new Blob([JSON.stringify(data)], { type: contentType || 'application/json' });
      }

      const res = this.base.put(url, { body, headers });
      return res.json();
    } catch (error) {
      console.error('PUT failed', error);
      throw new Error(`PUT failed: ${error}`);
    }
  }

  async postObject(key: string, data: unknown, contentType?: string) {
    try {
      const url = encodeURIComponent(key).replace(/%2F/g, '/');
      const headers: Record<string, string> = {};

      let body: BodyInit;
      if (typeof data === 'string') {
        body = new Blob([data], { type: contentType || 'text/plain; charset=utf-8' });
      } else if (data instanceof Blob) {
        body = data;
        if (contentType) headers['Content-Type'] = contentType;
      } else if (data instanceof ArrayBuffer) {
        body = new Blob([data], { type: contentType || 'application/octet-stream' });
      } else {
        body = new Blob([JSON.stringify(data)], { type: contentType || 'application/json' });
      }

      const res = this.base.post(url, { body, headers });
      return res.json();
    } catch (error) {
      console.error('POST failed', error);
      throw new Error(`POST failed: ${error}`);
    }
  }

  async deleteObject(key: string) {
    try {
      const url = encodeURIComponent(key).replace(/%2F/g, '/');
      const res = this.base.delete(url);
      return res.json();
    } catch (error) {
      console.error('DELETE failed', error);
      throw new Error(`DELETE failed: ${error}`);
    }
  }
}

// CLI implementation using Clipanion
abstract class BaseCommand extends Command {
  baseUrl = Option.String('--base-url', {
    description: 'Base URL (FQDN) of the CloudFront endpoint',
    required: false,
  });
  token = Option.String('--token', {
    description: 'Bearer token for authorization',
    required: false,
  });

  protected getClient(): VaultcoreClient {
    const baseUrl =
      this.baseUrl || process.env.ENV_REPO_BASE_URL || process.env.VAULTCORE_BASE_URL || '';
    const token = this.token || process.env.ENV_REPO_TOKEN || process.env.VAULTCORE_TOKEN || '';
    if (!baseUrl) {
      throw new Error('Missing base URL. Pass --base-url or set VAULTCORE_BASE_URL');
    }
    if (!token) {
      throw new Error('Missing token. Pass --token or set VAULTCORE_TOKEN');
    }
    return new VaultcoreClient({ baseUrl, accessToken: token });
  }
}

class CreateCommand extends BaseCommand {
  static paths = [['create']];

  static usage = Command.Usage({
    description: 'Create a new object (POST) from a local file',
    examples: [
      [
        'Create object from ./file.txt',
        'vaultcore create s3/path/to/file.txt ./file.txt --base-url https://FQDN --token TOKEN',
      ],
    ],
  });

  key = Option.String({ required: true });
  filePath = Option.String({ required: true });
  contentType = Option.String('--content-type', {
    description: 'Content-Type to set on the object',
    required: false,
  });

  async execute() {
    try {
      const client = this.getClient();
      const buffer = await fs.readFile(this.filePath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      const res: any = await client.postObject(this.key, arrayBuffer, this.contentType).catch(errorHandler);
      this.context.stdout.write(`${res.key}\n`);
      return 0;
    } catch (error) {
      console.error('CREATE failed', error);
      throw new Error(`CREATE failed: ${error}`);
    }
  }
}

class UpdateCommand extends BaseCommand {
  static paths = [['update']];

  static usage = Command.Usage({
    description: 'Update or replace an object (PUT) from a local file',
    examples: [
      [
        'Update object from ./file.txt',
        'vaultcore update s3/path/to/file.txt ./file.txt --base-url https://FQDN --token TOKEN',
      ],
    ],
  });

  key = Option.String({ required: true });
  filePath = Option.String({ required: true });
  contentType = Option.String('--content-type');

  async execute() {
    try {
      const client = this.getClient();
      const buffer = await fs.readFile(this.filePath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      const res: any = await client.putObject(this.key, arrayBuffer, this.contentType).catch(errorHandler);
      this.context.stdout.write(`${res.key}\n`);
      return 0;
    } catch (error) {
      console.error('UPDATE failed', error);
      throw new Error(`UPDATE failed: ${error}`);
    }
  }
}

class ReadCommand extends BaseCommand {
  static paths = [['read']];

  static usage = Command.Usage({
    description: 'Read an object and write to local file',
    examples: [['Read object to ./file.txt', 'vaultcore read s3/path/to/file.txt']],
  });

  key = Option.String({ required: true });
  outPath = Option.String({ required: false });

  async execute() {
    try {
      const client = this.getClient();
      const arrayBuffer = await client.getObject(this.key, 'arrayBuffer').catch(errorHandler);
      const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
      const output = this.outPath || path.join(process.cwd(), path.basename(this.key));
      await fs.writeFile(output, buffer);
      this.context.stdout.write(`${output}\n`);
      return 0;
    } catch (error) {
      console.error('READ failed', error);
      throw new Error(`READ failed: ${error}`);
    }
  }
}

class DeleteCommand extends BaseCommand {
  static paths = [['delete']];

  static usage = Command.Usage({
    description: 'Delete an object',
    examples: [
      [
        'Delete object by key',
        'vaultcore delete s3/path/to/file.txt --base-url https://FQDN --token TOKEN',
      ],
    ],
  });

  key = Option.String({ required: true });

  async execute() {
    try {
      const client = this.getClient();
      await client.deleteObject(this.key).catch(errorHandler);
      this.context.stdout.write(`${this.key}\n`);
      return 0;
    } catch (error) {
      console.error('DELETE failed', error);
      throw new Error(`DELETE failed: ${error}`);
    }
  }
}

const cli = new Cli({
  binaryLabel: 'vaultcore',
  binaryName: 'vaultcore',
  binaryVersion: version,
});

cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);
cli.register(CreateCommand);
cli.register(UpdateCommand);
cli.register(ReadCommand);
cli.register(DeleteCommand);

await cli.runExit(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
});

export default VaultcoreClient;
