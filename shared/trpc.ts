/**
 * Shared tRPC types - client-safe, no server runtime imports
 * This file is imported by the client to avoid pulling server code into the bundle
 */

export type AppRouter = import("../server/routers").AppRouter;
