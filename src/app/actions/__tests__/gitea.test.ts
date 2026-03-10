import { getGiteaConfig, saveGiteaConfig, testGiteaConnection } from '../gitea';
import { db } from '@/../db';
import { getServerSession } from 'next-auth/next';

// Mock DB
jest.mock('@/../db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => null),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoUpdate: jest.fn(() => ({
          returning: jest.fn(() => ({
            get: jest.fn(() => ({})),
          })),
        })),
      })),
    })),
  },
}));

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/auth', () => ({
  authOptions: {},
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Gitea actions', () => {
  const mockSession = {
    user: { id: 'user1' },
  };

  const mockConfig = {
    url: 'https://gitea.com',
    username: 'user1',
    token: 'token1',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('getGiteaConfig', () => {
    it('throws unauthorized if no session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      await expect(getGiteaConfig()).rejects.toThrow('Unauthorized');
    });

    it('returns null if no config found', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn(() => null),
          })),
        })),
      });

      const result = await getGiteaConfig();
      expect(result).toBeNull();
    });

    it('returns config if found', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn(() => mockConfig),
          })),
        })),
      });

      const result = await getGiteaConfig();
      expect(result).toEqual(mockConfig);
    });
  });

  describe('saveGiteaConfig', () => {
    it('saves configuration using upsert', async () => {
      const giteaData = { url: 'https://gitea.com', username: 'u1', token: 't1' };
      
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn(() => ({
          onConflictDoUpdate: jest.fn(() => ({
            returning: jest.fn(() => ({
              get: jest.fn(() => ({ ...giteaData, updatedAt: new Date() })),
            })),
          })),
        })),
      });

      const result = await saveGiteaConfig(giteaData);
      expect(db.insert).toHaveBeenCalled();
      expect(result.username).toBe('u1');
    });
  });

  describe('testGiteaConnection', () => {
    it('returns success on valid response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ login: 'user1', email: 'u1@e.com', avatar_url: 'url' }),
        headers: { get: jest.fn().mockReturnValue('repo, user') },
      });

      const result = await testGiteaConnection('https://gitea.com', 'token1');
      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('user1');
      expect(result.scopes).toEqual(['repo', 'user']);
    });

    it('returns failure on invalid URL', async () => {
      await expect(testGiteaConnection('invalid-url', 'token')).rejects.toThrow('Invalid URL');
    });

    it('returns failure on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ message: 'Bad credentials' }),
      });

      const result = await testGiteaConnection('https://gitea.com', 'bad-token');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bad credentials');
    });
  });
});
