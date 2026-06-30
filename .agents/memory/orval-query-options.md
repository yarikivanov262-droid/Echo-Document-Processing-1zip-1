---
name: Orval query options typing
description: How to pass partial query options (like refetchInterval) to Orval-generated React Query hooks without TypeScript errors.
---

When passing runtime-only options like `refetchInterval` or `enabled` to Orval-generated hooks, TypeScript complains that `queryKey` is missing from `UseQueryOptions` even though Orval provides it internally.

**Fix:** Type-assert the `query` option as `never`:
```typescript
useGetChats({ query: { refetchInterval: 3000 } as never })
useGetChat(id, { query: { enabled: !!id } as never })
```

**Why:** Orval v7 + TanStack Query v5 makes `queryKey` required in `UseQueryOptions`, but the generated hook auto-populates it. The `as never` cast suppresses the complaint without losing type safety on the return value.

**How to apply:** Any time you add `refetchInterval`, `enabled`, `staleTime`, or other `UseQueryOptions` fields to an Orval-generated hook call.
