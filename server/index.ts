import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { evaluateCase } from "../src/engine/evaluateCase";
import type { CaseSnapshot } from "../src/types";
import { applyCors } from "./cors";

const port = Number(process.env.PORT) || 3001;
const host = "0.0.0.0";

function send(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
  applyCors(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (req.method === "OPTIONS") {
    applyCors(req, res);
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && url.pathname === "/health") {
    send(req, res, 200, { ok: true, service: "fdr-setu-api" });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/evaluate") {
    void readBody(req)
      .then((raw) => {
        const parsed = JSON.parse(raw) as { snapshot?: CaseSnapshot };
        if (!parsed.snapshot || typeof parsed.snapshot.caseId !== "string") {
          send(req, res, 400, { error: "snapshot required" });
          return;
        }
        send(req, res, 200, evaluateCase(parsed.snapshot));
      })
      .catch(() => {
        send(req, res, 400, { error: "invalid JSON" });
      });
    return;
  }
  send(req, res, 404, { error: "not found" });
});

server.listen(port, host, () => {
  console.log(`fdr-setu-api listening on http://${host}:${port}`);
});
