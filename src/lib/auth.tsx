import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type AppRole = "admin" | "implantador" | "vendedor";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { id: string; name: string; email: string; avatar_url?: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ id: string; name: string; email: string; avatar_url?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch role and profile
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (roleData) {
              setRole(roleData.role as AppRole);
            }

            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, name, email, avatar_url")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (profileData) {
              setProfile(profileData);
            }
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id, name, email, avatar_url")
            .eq("user_id", session.user.id)
            .maybeSingle(),
        ]).then(([roleResult, profileResult]) => {
          if (roleResult.data) {
            setRole(roleResult.data.role as AppRole);
          }
          if (profileResult.data) {
            setProfile(profileResult.data);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
