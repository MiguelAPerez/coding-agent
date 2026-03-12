import { loadRepoData } from '../mockDataLoader';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('path');

describe('loadRepoData', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load from feature directory if it exists', async () => {
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (path.join as jest.Mock).mockReturnValueOnce('/mock/cwd/data/repos/test-repo');

        (fs.existsSync as jest.Mock).mockReturnValue(true); // Repo exists, Feature exists, file exists

        const result = await loadRepoData('test-repo', 'feature-x');
        
        expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo/feature-x');
        // Check that it's trying to load from the feature folder
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo/feature-x', 'responseTests.json');
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo/feature-x', 'personas.json');
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo/feature-x', 'agents.json');
        
        expect(result).toHaveProperty('responseTests');
        expect(result).toHaveProperty('personas');
        expect(result).toHaveProperty('agents');
    });

    it('should fallback to root repo path if feature directory does not exist', async () => {
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (path.join as jest.Mock).mockReturnValueOnce('/mock/cwd/data/repos/test-repo');

        (fs.existsSync as jest.Mock).mockImplementation((p) => {
            if (p === '/mock/cwd/data/repos/test-repo/feature-x') return false;
            return true; // Repo exists
        });

        const result = await loadRepoData('test-repo', 'feature-x');

        expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo/feature-x');
        // Check that it falls back to the root folder
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo', 'responseTests.json');
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo', 'personas.json');
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo', 'agents.json');

        expect(result).toHaveProperty('responseTests');
        expect(result).toHaveProperty('personas');
    });
});
