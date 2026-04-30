import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 14);

export function createId(prefix: string) {
  return `${prefix}_${nano()}`;
}
