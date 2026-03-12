import { simulateBenchmarkStep } from '../benchmarks';
import { db } from '@/../db';
import { getServerSession } from 'next-auth/next';

// Mock DB
jest.mock('@/../db', () => ({
    db: {
        select: jest.fn(() => ({
            from: jest.fn(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(),
                    all: jest.fn(),
                    limit: jest.fn(() => ({
                        all: jest.fn()
                    }))
                }))
            }))
        })),
        update: jest.fn(() => ({
            set: jest.fn(() => ({
                where: jest.fn(() => ({
                    run: jest.fn()
                }))
            }))
        })),
        insert: jest.fn(() => ({
            values: jest.fn(() => ({
                run: jest.fn()
            }))
        }))
    }
}));

// Mock NextAuth
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn()
}));

// Mock Auth Options
jest.mock('@/auth', () => ({
    authOptions: {}
}));

// Mock Ollama
jest.mock('../ollama', () => ({
    getOllamaConfig: jest.fn(() => ({ url: 'http://localhost:11434' }))
}));

// Mock Cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

global.fetch = jest.fn();

describe('simulateBenchmarkStep concurrency limits', () => {
    const mockSession = { user: { id: 'user1' } };
    const mockBenchmarkId = 'bench-123';

    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('throws unauthorized if no session', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);
        await expect(simulateBenchmarkStep(mockBenchmarkId)).rejects.toThrow('Unauthorized');
    });

    it('returns finished true if benchmark is not running', async () => {
        (db.select as jest.Mock).mockReturnValueOnce({
            from: jest.fn().mockReturnValueOnce({
                where: jest.fn().mockReturnValueOnce({
                    get: jest.fn().mockReturnValueOnce({ id: mockBenchmarkId, status: 'completed' })
                })
            })
        });

        const result = await simulateBenchmarkStep(mockBenchmarkId);
        expect(result).toEqual({ finished: true });
    });

    it('returns throttled true if active running entries equals parallelWorkers limit', async () => {
        // Setup mock: Benchmark has limit of 2
        const mockBenchmark = { id: mockBenchmarkId, status: 'running', parallelWorkers: 2 };
        
        // Setup mock: DB says 2 are currently running
        const mockRunningEntries = [
            { id: 'entry-1', status: 'running' },
            { id: 'entry-2', status: 'running' }
        ];

        // 1st query: get benchmark
        // 2nd query: count running
        const selectMock = jest.fn()
            .mockReturnValueOnce({ // get benchmark
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        get: jest.fn().mockReturnValueOnce(mockBenchmark)
                    })
                })
            })
            .mockReturnValueOnce({ // get current running
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        all: jest.fn().mockReturnValueOnce(mockRunningEntries)
                    })
                })
            });

        (db.select as jest.Mock).mockImplementation(selectMock);

        const result = await simulateBenchmarkStep(mockBenchmarkId);
        expect(result).toEqual({ finished: false, throttled: true });
    });

    it('returns throttled true if active running entries exceeds parallelWorkers limit', async () => {
        // Setup mock: Benchmark has limit of 1
        const mockBenchmark = { id: mockBenchmarkId, status: 'running', parallelWorkers: 1 };
        
        // Setup mock: DB says 3 are currently running (client glitched and over-spawned)
        const mockRunningEntries = [
            { id: 'entry-1', status: 'running' },
            { id: 'entry-2', status: 'running' },
            { id: 'entry-3', status: 'running' }
        ];

        const selectMock = jest.fn()
            .mockReturnValueOnce({ // get benchmark
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        get: jest.fn().mockReturnValueOnce(mockBenchmark)
                    })
                })
            })
            .mockReturnValueOnce({ // get current running
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        all: jest.fn().mockReturnValueOnce(mockRunningEntries)
                    })
                })
            });

        (db.select as jest.Mock).mockImplementation(selectMock);

        const result = await simulateBenchmarkStep(mockBenchmarkId);
        expect(result).toEqual({ finished: false, throttled: true });
    });

    it('proceeds if active running entries is below parallelWorkers limit', async () => {
        const mockBenchmark = { id: mockBenchmarkId, status: 'running', parallelWorkers: 4 };
        const mockRunningEntries = [
            { id: 'entry-1', status: 'running' }
        ]; // Only 1 running out of 4 allowed

        const mockPendingEntry = { id: 'entry-2', status: 'pending', contextGroupId: 'cg-1' };

        const selectMock = jest.fn()
            .mockReturnValueOnce({ // get benchmark
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        get: jest.fn().mockReturnValueOnce(mockBenchmark)
                    })
                })
            })
            .mockReturnValueOnce({ // get current running
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        all: jest.fn().mockReturnValueOnce(mockRunningEntries)
                    })
                })
            })
            .mockReturnValueOnce({ // get pending
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        limit: jest.fn().mockReturnValueOnce({
                            all: jest.fn().mockReturnValueOnce([mockPendingEntry])
                        })
                    })
                })
            })
            .mockReturnValueOnce({ // get context group
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        get: jest.fn().mockReturnValueOnce({
                            id: 'cg-1', 
                            expectations: '[]', 
                            promptTemplate: 'test prompt',
                            category: 'Test'
                        })
                    })
                })
            })
            .mockReturnValueOnce({ // get benchmark for completed updates (line 555)
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        get: jest.fn().mockReturnValueOnce({ completedEntries: 0 })
                    })
                })
            })
            .mockReturnValueOnce({ // get updated entry for return (newly added)
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        get: jest.fn().mockReturnValueOnce({ id: 'entry-2', status: 'completed' })
                    })
                })
            });

        (db.select as jest.Mock).mockImplementation(selectMock);

        // Mock the update statement to simulate a successful atomic claim
        const mockUpdateResult = { changes: 1 };
        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    run: jest.fn().mockReturnValue(mockUpdateResult)
                })
            })
        });
        
        // Mock successful ollama fetch
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ response: 'Test AI Output' })
        });


        const result = await simulateBenchmarkStep(mockBenchmarkId);
        
        // Assert it made it past the throttle check and executed the generation process
        expect(result).toEqual({ 
            finished: false, 
            entry: { id: 'entry-2', status: 'completed' } 
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
