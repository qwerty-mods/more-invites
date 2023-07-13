import { request } from "http";
import { Injector, Logger, webpack } from "replugged";

const inject = new Injector();
const logger = Logger.plugin("MoreInvites");

const DSC_REGEX = /(?:https?:\/\/)?dsc\.gg\/(\w+?)(?:$|[^\w])/gm

type CodedLinks = Array<{
  code?: string;
  type: string;
  from?: string; // for us
}>

const cache: Record<string, string> = {};

function getCode(code: string): string {
  if (cache[code]) {
    return cache[code];
  }

  const options = {
    hostname: "https://dsc.gg",
    path: code,
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.142.86 Safari/537.36",
    }
  }

  request(options, (res) => {
    const { statusCode } = res;
    if (statusCode !== 200) {
      logger.error(`statusCode: ${statusCode}`);
    }

    if (res.url) {
      cache[code] = res.url.split("/")[4];
    }
  })

  return cache[code];
}

export async function start(): Promise<void> {
  const mod = await webpack.waitForModule<Record<string, (args: string) => CodedLinks>>(
    webpack.filters.bySource(".URL_REGEX)"),
  );
  const key = webpack.getFunctionKeyBySource(mod, ".URL_REGEX)");

  if (mod && key) {
    inject.after(mod, key, ([ args ], res) => {
      console.log(args, res);

      if (args) {
        const matches = args.matchAll(DSC_REGEX);
        console.log(matches);
        for (const [ , code ] of matches) {
          res.push({
            code: getCode(code),
            type: "INVITE",
            from: "dsc.gg",
          })
        }
      }

      return res;
    });
  }
}

export function stop(): void {
  inject.uninjectAll();
}
