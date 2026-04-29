import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState(null);
  const [bootChecked, setBootChecked] = useState(false);

  useEffect(() => {
    if (!supabase) { setBootChecked(true); return; }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setBootChecked(true);
      // Supabase's detectSessionInUrl strips the auth tokens but leaves an
      // empty `#` behind. Clean it so the URL bar isn't ugly post-login.
      if (window.location.hash === '' && window.location.href.endsWith('#')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'openid email profile',
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { user, bootChecked, signInWithGoogle, signOut };
};
