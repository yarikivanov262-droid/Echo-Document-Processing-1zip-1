import { customFetch as defaultCustomFetch } from "../custom-fetch";

// We patch the custom fetch to inject the authorization token from localStorage.
// Since we don't want to modify the generated api client directly, we'll
// override the global fetch or intercept where possible. But actually,
// we CAN just modify custom-fetch.ts to read from localStorage. Let's do that next.
// Wait, custom-fetch.ts is in lib/api-client-react/src/custom-fetch.ts
