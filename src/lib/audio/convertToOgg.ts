import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";

/** Converte um áudio gravado no navegador (webm/opus) pra ogg/opus — formato exigido pelo WhatsApp pra tocar como nota de voz nativa. */
export async function convertToOggOpus(inputBuffer: Buffer): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = path.join(tmpdir(), `${id}-input.webm`);
  const outputPath = path.join(tmpdir(), `${id}-output.ogg`);

  try {
    await writeFile(inputPath, inputBuffer);
    try {
      await execFileAsync(FFMPEG_BIN, ["-y", "-i", inputPath, "-c:a", "libopus", "-b:a", "32k", "-vn", outputPath]);
    } catch (err) {
      // ENOENT aqui é sempre config de ambiente (FFMPEG_PATH errado/vazio ou
      // ffmpeg não instalado no servidor) — nunca vale a pena mostrar o path
      // bruto do binário pro usuário final.
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        throw new Error(
          "Conversão de áudio indisponível no servidor: ffmpeg não encontrado (verifique FFMPEG_PATH ou a instalação do ffmpeg).",
        );
      }
      throw err;
    }
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
