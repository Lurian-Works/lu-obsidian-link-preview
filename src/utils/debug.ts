import createDebug from "debug"

export function luDebug(namespace: string) {
  return createDebug("LuLink").extend(namespace)
}
