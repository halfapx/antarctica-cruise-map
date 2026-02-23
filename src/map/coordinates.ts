export const isPointCoordinates = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number";

export const isLineCoordinates = (value: unknown): value is [number, number][] =>
  Array.isArray(value) && value.every((item) => isPointCoordinates(item));
