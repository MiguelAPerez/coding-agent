import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeSearchPage from './page';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchCode } from '@/app/actions/search';
import { semanticSearch } from '@/app/actions/semantic-search';
import { getCachedRepositories } from '@/app/actions/repositories';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Server Actions
jest.mock('@/app/actions/search', () => ({
  searchCode: jest.fn(),
}));
jest.mock('@/app/actions/semantic-search', () => ({
  semanticSearch: jest.fn(),
}));
jest.mock('@/app/actions/repositories', () => ({
  getCachedRepositories: jest.fn(),
}));

describe('CodeSearchPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(() => null),
    getAll: jest.fn(() => []),
  };

  const mockRepos = [
    { id: '1', name: 'repo1', fullName: 'user/repo1', language: 'TypeScript', enabled: true },
    { id: '2', name: 'repo2', fullName: 'user/repo2', language: 'JavaScript', enabled: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (getCachedRepositories as jest.Mock).mockResolvedValue(mockRepos);
    (mockSearchParams.get as jest.Mock).mockImplementation(() => null);
    (mockSearchParams.getAll as jest.Mock).mockImplementation(() => []);
  });

  it('renders the search page and loads repositories', async () => {
    render(<CodeSearchPage />);

    expect(screen.getByText('Code Search')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('repo1')).toBeInTheDocument();
      expect(screen.getByText('repo2')).toBeInTheDocument();
    });
  });

  it('toggles search mode between Regex and Semantic', async () => {
    render(<CodeSearchPage />);
    await waitFor(() => screen.getByText('repo1'));
    
    const regexBtn = screen.getByRole('button', { name: /Regex/i });
    const semanticBtn = screen.getByRole('button', { name: /Semantic/i });

    fireEvent.click(semanticBtn);
    expect(screen.getByText(/Explore your codebase using natural language semantic search/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. how does authentication work\?/i)).toBeInTheDocument();

    fireEvent.click(regexBtn);
    expect(screen.getByText(/Search across your repositories using regular expressions/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. useEffect\\\(.*\\\[\\\]\\\)/i)).toBeInTheDocument();
  });

  it('validates regex pattern', async () => {
    render(<CodeSearchPage />);
    await waitFor(() => screen.getByText('repo1'));
    
    const input = screen.getByPlaceholderText(/e.g. useEffect\\\(.*\\\[\\\]\\\)/i);
    
    // Invalid regex
    fireEvent.change(input, { target: { value: '[' } });
    expect(screen.getByText('Invalid regular expression')).toBeInTheDocument();

    // Valid regex
    fireEvent.change(input, { target: { value: 'test' } });
    expect(screen.queryByText('Invalid regular expression')).not.toBeInTheDocument();
  });

  it('shows error if no repository is selected before search', async () => {
    render(<CodeSearchPage />);
    
    await waitFor(() => screen.getByText('repo1'));
    
    // Deselect all (initial state is empty if not in URL, but let's be sure)
    // Actually the code initializes with empty selectedRepoIds
    
    const input = screen.getByPlaceholderText(/e.g. useEffect\\\(.*\\\[\\\]\\\)/i);
    fireEvent.change(input, { target: { value: 'test' } });
    
    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    expect(screen.getByText('Please select at least one repository to search.')).toBeInTheDocument();
  });

  it('performs search when criteria are met', async () => {
    (searchCode as jest.Mock).mockResolvedValue([
      {
        repoId: '1',
        repoName: 'repo1',
        repoFullName: 'user/repo1',
        matches: [
          { filePath: 'src/index.ts', lineNumber: 10, lineContent: 'console.log("test")', matchStart: 13, matchEnd: 17 }
        ]
      }
    ]);

    render(<CodeSearchPage />);
    
    await waitFor(() => screen.getByText('repo1'));
    
    // Select repo1
    fireEvent.click(screen.getByText('repo1'));
    
    const input = screen.getByPlaceholderText(/e.g. useEffect\\\(.*\\\[\\\]\\\)/i);
    fireEvent.change(input, { target: { value: 'test' } });
    
    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(searchCode).toHaveBeenCalled();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('user/repo1')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/src\//i)).toBeInTheDocument();
    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getAllByText(/match/i).length).toBeGreaterThan(0);
  });

  it('toggles advanced options', async () => {
    render(<CodeSearchPage />);
    await waitFor(() => screen.getByText('repo1'));
    
    const advancedBtn = screen.getByRole('button', { name: /Advanced Options/i });
    fireEvent.click(advancedBtn);
    
    expect(screen.getAllByText(/File Types/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Exclude Paths/i).length).toBeGreaterThan(0);
  });

  it('handles semantic search', async () => {
    (semanticSearch as jest.Mock).mockResolvedValue([
      {
        repoId: '1',
        repoName: 'repo1',
        repoFullName: 'user/repo1',
        matches: [
          { filePath: 'src/auth.ts', lineNumber: 5, lineContent: 'function login() {}', matchStart: 9, matchEnd: 14, similarity: 0.85 }
        ]
      }
    ]);

    render(<CodeSearchPage />);
    
    await waitFor(() => screen.getByText('repo1'));
    
    // Switch to semantic
    fireEvent.click(screen.getByRole('button', { name: /Semantic/i }));
    
    // Select repo1
    fireEvent.click(screen.getByText('repo1'));
    
    const input = screen.getByPlaceholderText(/e.g. how does authentication work\?/i);
    fireEvent.change(input, { target: { value: 'auth' } });
    
    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(semanticSearch).toHaveBeenCalledWith(expect.objectContaining({
        repoIds: ['1'],
        query: 'auth'
      }));
      expect(screen.getByText('85% match')).toBeInTheDocument();
    });
  });
});
