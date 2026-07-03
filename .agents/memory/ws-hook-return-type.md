---
name: WS event hook return type
description: useWsEvent must wrap echoWs.on() return in a void arrow to satisfy useEffect Destructor type.
---

## Rule
`echoWs.on(handler)` returns `() => boolean` (because `Set.delete` returns boolean). React's `useEffect` Destructor type requires `() => void`. Wrap the return:

```ts
const off = echoWs.on(stableHandler);
return () => { off(); };
```

**Why:** `() => boolean` is not assignable to `Destructor` (`() => void | { [UNDEFINED_VOID_ONLY]: never }`). TypeScript TS2345 error.

**How to apply:** Any hook that registers a WS listener via `echoWs.on()` inside `useEffect` must use the wrapper pattern above.
