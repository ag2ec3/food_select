"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mapSupabaseAuthErrorMessage } from "@/lib/apiErrors";
import type { User } from "@/lib/types";
import { mapAuthUserToUser } from "@/lib/mapAuthUser";
import { createClient } from "@/lib/supabase/client";

type LoginResult =
  | { ok: true }
  | { ok: false; message: string };

type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; message: string };

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = createClient();

      void supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (!cancelled) {
          setUser(mapAuthUserToUser(authUser));
          setReady(true);
        }
      });

      const { data: authSub } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(mapAuthUserToUser(session?.user ?? null));
        },
      );
      subscription = authSub.subscription;
    } catch {
      if (!cancelled) {
        setReady(true);
      }
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      return { ok: false as const, message: "이메일과 비밀번호를 입력해 주세요." };
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) {
        return {
          ok: false as const,
          message: mapSupabaseAuthErrorMessage(error.message),
        };
      }
      return { ok: true as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      return {
        ok: false as const,
        message: msg || mapSupabaseAuthErrorMessage(undefined),
      };
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedName || !trimmedEmail || !password) {
        return { ok: false as const, message: "이름, 이메일, 비밀번호를 모두 입력해 주세요." };
      }
      const supabase = createClient();
      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { name: trimmedName },
          },
        });
        if (error) {
          return {
            ok: false as const,
            message: mapSupabaseAuthErrorMessage(error.message),
          };
        }
        if (!data.session) {
          return { ok: true as const, needsEmailConfirmation: true };
        }
        return { ok: true as const, needsEmailConfirmation: false };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        return {
          ok: false as const,
          message: msg || mapSupabaseAuthErrorMessage(undefined),
        };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login,
      signUp,
      logout,
    }),
    [user, ready, login, signUp, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
