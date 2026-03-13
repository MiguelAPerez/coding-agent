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
        (fs.existsSync as jest.Mock).mockReturnValue(true); 
        const fullPath = '/mock/cwd/data/repos/test-repo';
        const result = await loadRepoData(fullPath, 'feature-x');
        
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
        (fs.existsSync as jest.Mock).mockImplementation((p) => {
            if (p === '/mock/cwd/data/repos/test-repo/feature-x') return false;
            return true; // Repo exists
        });

        const fullPath = '/mock/cwd/data/repos/test-repo';
        const result = await loadRepoData(fullPath, 'feature-x');

        expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo/feature-x');
        // Check that it falls back to the root folder
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo', 'responseTests.json');
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo', 'personas.json');
        expect(path.join).toHaveBeenCalledWith('/mock/cwd/data/repos/test-repo', 'agents.json');

        expect(result).toHaveProperty('responseTests');
        expect(result).toHaveProperty('personas');
    });

    it('should produce stable IDs for the same input data when IDs are missing', async () => {
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const mockResponseTests = [
            { name: "Test 1", category: "Cat1", prompt: "Prompt 1", expectations: [] }
        ];

        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockResponseTests));

        const fullPath = '/mock/cwd/data/repos/test-repo';
        const result1 = await loadRepoData(fullPath);
        const id1 = result1.responseTests[0].id;

        const result2 = await loadRepoData(fullPath);
        const id2 = result2.responseTests[0].id;

        expect(id1).toBe(id2);
        expect(id1).toBeDefined();
        expect(typeof id1).toBe('string');
    });
});
