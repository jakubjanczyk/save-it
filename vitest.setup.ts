import "@testing-library/jest-dom/vitest";

import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";

const NodeUint8Array = Object.getPrototypeOf(
  Object.getPrototypeOf(Buffer.from(""))
).constructor as typeof Uint8Array;

Object.defineProperty(globalThis, "Uint8Array", { value: NodeUint8Array });

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, "subtle", {
    value: webcrypto.subtle,
  });
}

Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder });
Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoder });
