import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-1",
      email: "test@rapt.app",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      subscriptionTier: "pro",
      subscriptionExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.email).toBe("test@rapt.app");
  });

  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      user: createCtx().user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string) => cleared.push(name) } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

describe("subscription.get", () => {
  it("returns tier limits for free tier", async () => {
    const ctx = createCtx({ subscriptionTier: "free" });
    const caller = appRouter.createCaller(ctx);
    const sub = await caller.subscription.get();
    expect(sub.tier).toBe("free");
    expect(sub.limits.maxProperties).toBe(1);
    expect(sub.limits.aiListings).toBe(false);
  });

  it("returns tier limits for pro tier", async () => {
    const ctx = createCtx({ subscriptionTier: "pro" });
    const caller = appRouter.createCaller(ctx);
    const sub = await caller.subscription.get();
    expect(sub.tier).toBe("pro");
    expect(sub.limits.maxProperties).toBe(10);
    expect(sub.limits.aiListings).toBe(true);
  });

  it("returns tier limits for advanced tier", async () => {
    const ctx = createCtx({ subscriptionTier: "advanced" });
    const caller = appRouter.createCaller(ctx);
    const sub = await caller.subscription.get();
    expect(sub.tier).toBe("advanced");
    expect(sub.limits.maxProperties).toBe(999);
    expect(sub.limits.automation).toBe(true);
  });
});
