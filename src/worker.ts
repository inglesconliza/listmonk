import { Container } from "@cloudflare/containers";
import { handleListmonkRequest, type ListmonkEnv } from "./readiness";

type Env = ListmonkEnv & {
  LISTMONK_CONTAINER: DurableObjectNamespace<ListmonkContainer>;
};

export class ListmonkContainer extends Container {
  defaultPort = 9000;
  requiredPorts = [9000];
  sleepAfter = "2h";
  enableInternet = true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleListmonkRequest(request, env);
  }
};
