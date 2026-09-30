import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

async function runAuthAction(action) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  try {
    return await action(supabase.auth);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('The authentication request failed.'),
    };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        setUser(error ? null : data.session?.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    isConfigured: isSupabaseConfigured,
    signIn: (credentials) => runAuthAction((auth) => auth.signInWithPassword(credentials)),
    signUp: (credentials) => runAuthAction((auth) => auth.signUp(credentials)),
    signOut: () => runAuthAction((auth) => auth.signOut()),
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
