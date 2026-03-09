import { searchCode } from '../search';
import fs from 'fs/promises';
import { db } from '@/../db';
import { getServerSession } from 'next-auth/next';

jest.mock('fs/promises');
jest.mock('@/../db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          all: jest.fn(() => []),
        })),
      })),
    })),
  },
}));
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));
jest.mock('@/auth', () => ({
  authOptions: {},
}));
jest.mock('@/lib/constants', () => ({
  isPathBlocked: jest.fn(() => false),
}));

describe('searchCode action', () => {
  const mockSession = {
    user: { id: 'user1' },
  };

  const mockRepos = [
    { id: '1', name: 'repo1', fullName: 'user/repo1', userId: 'user1' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('throws unauthorized if no session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    await expect(searchCode({ repoIds: ['1'], pattern: 'test' })).rejects.toThrow('Unauthorized');
  });

  it('returns empty results if pattern is empty', async () => {
    const result = await searchCode({ repoIds: ['1'], pattern: '' });
    expect(result).toEqual([]);
  });

  it('validates regex pattern', async () => {
    await expect(searchCode({ repoIds: ['1'], pattern: '[' })).rejects.toThrow('Invalid regular expression pattern');
  });

  it('performs code search across repositories', async () => {
    // Mock DB response
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          all: jest.fn(() => mockRepos),
        })),
      })),
    });

    // Mock FS
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([
      { name: 'index.ts', isDirectory: () => false },
    ]);
    (fs.readFile as jest.Mock).mockResolvedValue('console.log("test code");\n// another line');

    const results = await searchCode({
      repoIds: ['1'],
      pattern: 'test',
    });

    expect(results).toHaveLength(1);
    expect(results[0].repoName).toBe('repo1');
    expect(results[0].matches).toHaveLength(1);
    expect(results[0].matches[0].lineContent).toContain('test code');
    expect(results[0].matches[0].lineNumber).toBe(1);
  });
});
