import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GiteaConfiguration from '../GiteaConfiguration';
import * as giteaActions from '@/app/actions/gitea';

// Mock Server Actions
jest.mock('@/app/actions/gitea', () => ({
  getGiteaConfig: jest.fn(),
  saveGiteaConfig: jest.fn(),
  testGiteaConnection: jest.fn(),
}));

describe('GiteaConfiguration Component', () => {
  const mockConfig = {
    url: 'https://gitea.com',
    username: 'user1',
    token: 'token1',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    (giteaActions.getGiteaConfig as jest.Mock).mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders existing configuration', async () => {
    render(<GiteaConfiguration />);
    
    // Wait for the config to load by checking for one of the values
    await waitFor(() => {
      expect(screen.getByLabelText(/Instance URL/i)).toHaveValue('https://gitea.com');
    });

    expect(screen.getByLabelText(/Username/i)).toHaveValue('user1');
    expect(screen.getByLabelText(/Access Token/i)).toHaveValue('token1');
  });

  it('tests connection and shows success result', async () => {
    (giteaActions.testGiteaConnection as jest.Mock).mockResolvedValue({
      success: true,
      user: { username: 'user1', email: 'u@e.com', avatarUrl: 'url' },
      scopes: ['repo', 'user'],
    });

    render(<GiteaConfiguration />);
    // Wait for initial load
    await screen.findByDisplayValue('https://gitea.com');
    
    const testBtn = screen.getByText(/Test Connection/i);
    fireEvent.click(testBtn);
    
    await screen.findByText(/Connection Successful/i);
    expect(screen.getByText(/Connected as user1/i)).toBeInTheDocument();
    expect(screen.getByText('repo')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('saves configuration after successful test', async () => {
    (giteaActions.testGiteaConnection as jest.Mock).mockResolvedValue({ success: true });
    (giteaActions.saveGiteaConfig as jest.Mock).mockResolvedValue({ updatedAt: new Date() });
    
    render(<GiteaConfiguration />);
    await screen.findByDisplayValue('https://gitea.com');
    
    const saveBtn = screen.getByText(/Save Configuration/i);
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(giteaActions.testGiteaConnection).toHaveBeenCalled();
      expect(giteaActions.saveGiteaConfig).toHaveBeenCalledWith({
        url: 'https://gitea.com',
        username: 'user1',
        token: 'token1',
      });
    });
  });

  it('shows error if connection test fails during save', async () => {
    (giteaActions.testGiteaConnection as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Invalid token',
    });
    
    render(<GiteaConfiguration />);
    await screen.findByDisplayValue('https://gitea.com');
    
    const saveBtn = screen.getByText(/Save Configuration/i);
    fireEvent.click(saveBtn);
    
    await screen.findByText(/Invalid token/i);
    expect(giteaActions.saveGiteaConfig).not.toHaveBeenCalled();
  });
});
