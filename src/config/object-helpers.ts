import type { FieldSource } from "../types";

type UnknownRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry)) as T;
  }

  if (isPlainObject(value)) {
    const copy: UnknownRecord = {};

    for (const [key, entry] of Object.entries(value)) {
      copy[key] = cloneValue(entry);
    }

    return copy as T;
  }

  return value;
}

export function mergeKnownValues(
  target: UnknownRecord,
  source: UnknownRecord
): UnknownRecord {
  for (const key of Object.keys(source)) {
    const value = source[key];

    if (isPlainObject(value)) {
      const existing = isPlainObject(target[key]) ? (target[key] as UnknownRecord) : {};
      target[key] = mergeKnownValues(existing, value);
      continue;
    }

    target[key] = cloneValue(value);
  }

  return target;
}

export function collectFieldSources(
  value: unknown,
  source: FieldSource,
  parentPath = ""
): Record<string, FieldSource> {
  const collected: Record<string, FieldSource> = {};

  function walk(current: unknown, currentPath: string): void {
    if (Array.isArray(current)) {
      if (currentPath) {
        collected[currentPath] = source;
      }
      return;
    }

    if (isPlainObject(current)) {
      for (const key of Object.keys(current)) {
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        walk(current[key], nextPath);
      }
      return;
    }

    if (currentPath) {
      collected[currentPath] = source;
    }
  }

  walk(value, parentPath);

  return collected;
}

export function setPathValue(
  target: UnknownRecord,
  path: string,
  value: unknown
): void {
  const segments = path.split(".");
  let current: UnknownRecord = target;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value;
      return;
    }

    const next = isPlainObject(current[segment]) ? (current[segment] as UnknownRecord) : {};
    current[segment] = next;
    current = next;
  });
}
