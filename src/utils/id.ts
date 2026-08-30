import { nanoid } from "nanoid";

export const newId = () => nanoid(12);
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
