import { v4 as uuidv4 } from 'uuid';
import { supabaseClient } from '../config/supabase.js';
import config from '../config/env.js';

// Mock predefined user profiles for offline development & hackathon demonstrations
const MOCK_PROFILES = {
  'officer@ssb.gov.in': {
    id: 'b1a2c3d4-0001-4000-8000-000000000001',
    email: 'officer@ssb.gov.in',
    full_name: 'Anita Sharma',
    badge_number: 'INV-001',
    checkpoint: 'Delhi (IGI) Airport — Terminal 3',
    role: 'investigator',
    status: 'active',
  },
  'authority@ssb.gov.in': {
    id: 'b1a2c3d4-0002-4000-8000-000000000002',
    email: 'authority@ssb.gov.in',
    full_name: 'Superintendent V. K. Saxena',
    badge_number: 'AUTH-001',
    checkpoint: 'SSB Central Command HQ',
    role: 'authority',
    status: 'active',
  },
};

/**
 * Authentication and User Profile Service
 */
export class AuthService {
  /**
   * Log in user with email and password
   * @param {string} email
   * @param {string} password
   */
  static async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. If Supabase is configured, authenticate with Supabase Auth
    if (config.supabase.isConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Fetch user profile from public.profiles
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        return {
          token: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          user: profile || {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'investigator',
            full_name: data.user.user_metadata?.full_name || 'SSB Officer',
          },
        };
      } catch (err) {
        // If not running in mock mode, rethrow
        if (!config.ai.isMock) {
          throw err;
        }
        console.warn('[AuthService] Supabase login error, falling back to mock:', err.message);
      }
    }

    // 2. Dev / Mock authentication fallback
    const mockUser = MOCK_PROFILES[normalizedEmail] || {
      id: uuidv4(),
      email: normalizedEmail,
      full_name: normalizedEmail.split('@')[0].toUpperCase(),
      badge_number: 'INV-DEMO',
      checkpoint: 'Border Checkpoint — SSB Counter 1',
      role: normalizedEmail.includes('authority') ? 'authority' : 'investigator',
      status: 'active',
    };

    const mockToken = `mock-jwt-${mockUser.id}-${Date.now()}`;

    return {
      token: mockToken,
      refreshToken: `mock-refresh-${uuidv4()}`,
      expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24, // 24h
      user: mockUser,
      isMockAuth: true,
    };
  }

  /**
   * Log out active session
   * @param {string} [token]
   */
  static async logout(token) {
    if (config.supabase.isConfigured && supabaseClient && token && !token.startsWith('mock-jwt')) {
      try {
        await supabaseClient.auth.signOut();
      } catch (err) {
        console.warn('[AuthService] Logout warning:', err.message);
      }
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Get authenticated user profile
   * @param {string} userId
   * @param {string} [email]
   */
  static async getProfile(userId, email) {
    if (config.supabase.isConfigured && supabaseClient && !userId.startsWith('mock-')) {
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[AuthService] Profile fetch warning:', err.message);
      }
    }

    // Return mock profile
    if (email && MOCK_PROFILES[email.toLowerCase()]) {
      return MOCK_PROFILES[email.toLowerCase()];
    }

    return {
      id: userId,
      email: email || 'officer@ssb.gov.in',
      full_name: 'Anita Sharma',
      badge_number: 'INV-001',
      checkpoint: 'Delhi (IGI) Airport — Terminal 3',
      role: 'investigator',
      status: 'active',
    };
  }
}

export default AuthService;
