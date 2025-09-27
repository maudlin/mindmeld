// tests/unit/services/CollaborationService.test.js
import { CollaborationService } from '../../../src/js/services/CollaborationService.js';
import { DataProviderService } from '../../../src/js/services/DataProviderService.js';
import { eventBus } from '../../../src/js/core/eventBus.js';

// Mock dependencies
jest.mock('../../../src/js/services/DataProviderService.js');
jest.mock('../../../src/js/core/eventBus.js');

describe('CollaborationService', () => {
  let collaborationService;
  let mockDataProviderService;
  let mockEventBus;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock DataProviderService
    mockDataProviderService = {
      enableCollaboration: jest.fn(),
      disableCollaboration: jest.fn(),
      isCollaborationEnabled: jest.fn(),
      getProviderType: jest.fn(),
    };
    DataProviderService.getInstance = jest.fn(() => mockDataProviderService);

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
    eventBus.emit = mockEventBus.emit;
    eventBus.on = mockEventBus.on;
    eventBus.off = mockEventBus.off;

    // Create fresh instance for each test
    CollaborationService._instance = null;
    collaborationService = CollaborationService.getInstance();
  });

  afterEach(() => {
    if (collaborationService) {
      collaborationService.destroy();
    }
  });

  describe('Singleton Pattern', () => {
    test('should implement singleton pattern correctly', () => {
      const instance1 = CollaborationService.getInstance();
      const instance2 = CollaborationService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(CollaborationService);
    });

    test('should throw error when trying to instantiate with new', () => {
      expect(() => {
        new CollaborationService();
      }).toThrow('Use CollaborationService.getInstance() instead of new');
    });

    test('should reset singleton instance on destroy', () => {
      const instance1 = CollaborationService.getInstance();
      instance1.destroy();

      const instance2 = CollaborationService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Initial State', () => {
    test('should start with no active session', () => {
      expect(collaborationService.getCurrentSession()).toBeNull();
      expect(collaborationService.isCollaborationActive()).toBe(false);
      expect(collaborationService.getActiveUsers()).toEqual([]);
    });

    test('should have proper initial configuration', () => {
      expect(collaborationService.getSessionConfig()).toEqual({
        maxUsers: 50,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        presenceUpdateInterval: 5000, // 5 seconds
      });
    });
  });

  describe('Service Lifecycle', () => {
    test('should initialize properly', () => {
      expect(collaborationService.isInitialized()).toBe(true);
    });

    test('should cleanup resources on destroy', () => {
      const mockCleanup = jest.fn();
      collaborationService._cleanupFunctions = [mockCleanup];

      collaborationService.destroy();

      expect(mockCleanup).toHaveBeenCalled();
      expect(collaborationService.getCurrentSession()).toBeNull();
    });
  });

  describe('Session Management', () => {
    describe('createSession', () => {
      test('should create a new collaboration session', async () => {
        const mapId = 'test-map-123';
        const options = {
          serverUrl: 'https://collaboration.test.com',
          permissions: 'admin',
          userInfo: { name: 'Test User', id: 'user-123' },
        };

        const session = await collaborationService.createSession(
          mapId,
          options,
        );

        expect(session).toEqual({
          id: expect.any(String),
          mapId,
          createdBy: 'user-123',
          createdAt: expect.any(Number),
          status: 'active',
          participants: [expect.objectContaining({ id: 'user-123' })],
          serverUrl: options.serverUrl,
          permissions: options.permissions,
        });

        expect(collaborationService.getCurrentSession()).toBe(session);
        expect(collaborationService.isCollaborationActive()).toBe(true);
      });

      test('should emit session.created event', async () => {
        const mapId = 'test-map-123';
        const options = {
          serverUrl: 'https://test.com',
          userInfo: { id: 'user-123' },
        };

        await collaborationService.createSession(mapId, options);

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'collaboration.session.created',
          {
            sessionId: expect.any(String),
            mapId,
            createdBy: 'user-123',
          },
        );
      });

      test('should throw error if session already exists', async () => {
        const mapId = 'test-map-123';
        const options = {
          serverUrl: 'https://test.com',
          userInfo: { id: 'user-123' },
        };

        await collaborationService.createSession(mapId, options);

        await expect(
          collaborationService.createSession(mapId, options),
        ).rejects.toThrow('Session already active. Call leaveSession() first.');
      });

      test('should validate required parameters', async () => {
        await expect(collaborationService.createSession()).rejects.toThrow(
          'mapId is required',
        );

        await expect(
          collaborationService.createSession('map-123'),
        ).rejects.toThrow('options.serverUrl is required');

        await expect(
          collaborationService.createSession('map-123', {
            serverUrl: 'https://test.com',
          }),
        ).rejects.toThrow('options.userInfo is required');
      });
    });

    describe('joinSession', () => {
      test('should join an existing session', async () => {
        const sessionId = 'session-456';
        const userInfo = { name: 'Joining User', id: 'user-456' };
        const serverUrl = 'https://collaboration.test.com';

        const result = await collaborationService.joinSession(
          sessionId,
          userInfo,
          serverUrl,
        );

        expect(result).toEqual({
          success: true,
          session: expect.objectContaining({
            id: sessionId,
            participants: expect.arrayContaining([
              expect.objectContaining({ id: 'user-456' }),
            ]),
          }),
        });

        expect(collaborationService.getCurrentSession()).toEqual(
          expect.objectContaining({ id: sessionId }),
        );
        expect(collaborationService.isCollaborationActive()).toBe(true);
      });

      test('should emit session.joined event', async () => {
        const sessionId = 'session-456';
        const userInfo = { id: 'user-456' };

        await collaborationService.joinSession(
          sessionId,
          userInfo,
          'https://test.com',
        );

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'collaboration.session.joined',
          {
            sessionId,
            userId: 'user-456',
          },
        );
      });

      test('should validate session exists before joining', async () => {
        const sessionId = 'non-existent-session';
        const userInfo = { id: 'user-456' };

        await expect(
          collaborationService.joinSession(
            sessionId,
            userInfo,
            'https://test.com',
          ),
        ).rejects.toThrow('Session not found or inactive');
      });

      test('should validate required parameters', async () => {
        await expect(collaborationService.joinSession()).rejects.toThrow(
          'sessionId is required',
        );

        await expect(
          collaborationService.joinSession('session-123'),
        ).rejects.toThrow('userInfo is required');

        await expect(
          collaborationService.joinSession('session-123', { id: 'user-123' }),
        ).rejects.toThrow('serverUrl is required');
      });
    });

    describe('leaveSession', () => {
      beforeEach(async () => {
        // Set up an active session for leave tests
        await collaborationService.createSession('test-map', {
          serverUrl: 'https://test.com',
          userInfo: { id: 'user-123', name: 'Test User' },
        });
      });

      test('should leave current session', async () => {
        const result = await collaborationService.leaveSession();

        expect(result).toEqual({ success: true });
        expect(collaborationService.getCurrentSession()).toBeNull();
        expect(collaborationService.isCollaborationActive()).toBe(false);
      });

      test('should emit session.left event', async () => {
        await collaborationService.leaveSession();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'collaboration.session.left',
          {
            sessionId: expect.any(String),
            userId: 'user-123',
          },
        );
      });

      test('should handle leaving when no session is active', async () => {
        await collaborationService.leaveSession(); // Leave once

        const result = await collaborationService.leaveSession(); // Try to leave again

        expect(result).toEqual({
          success: true,
          message: 'No active session to leave',
        });
      });

      test('should cleanup session resources', async () => {
        const mockCleanup = jest.fn();
        collaborationService._sessionCleanup = mockCleanup;

        await collaborationService.leaveSession();

        expect(mockCleanup).toHaveBeenCalled();
      });
    });

    describe('getActiveUsers', () => {
      test('should return empty array when no session is active', () => {
        expect(collaborationService.getActiveUsers()).toEqual([]);
      });

      test('should return participants from active session', async () => {
        await collaborationService.createSession('test-map', {
          serverUrl: 'https://test.com',
          userInfo: { id: 'user-123', name: 'Test User' },
        });

        const users = collaborationService.getActiveUsers();

        expect(users).toEqual([
          expect.objectContaining({
            id: 'user-123',
            name: 'Test User',
            joinedAt: expect.any(Number),
          }),
        ]);
      });
    });

    describe('updateUserPresence', () => {
      beforeEach(async () => {
        await collaborationService.createSession('test-map', {
          serverUrl: 'https://test.com',
          userInfo: { id: 'user-123', name: 'Test User' },
        });
      });

      test('should update user presence data', () => {
        const presenceData = {
          cursor: { x: 100, y: 200 },
          activity: 'editing',
          target: 'note-456',
        };

        collaborationService.updateUserPresence('user-123', presenceData);

        const users = collaborationService.getActiveUsers();
        expect(users[0].presence).toEqual(
          expect.objectContaining(presenceData),
        );
      });

      test('should emit presence.updated event', () => {
        const presenceData = { cursor: { x: 100, y: 200 } };

        collaborationService.updateUserPresence('user-123', presenceData);

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'collaboration.presence.updated',
          {
            userId: 'user-123',
            presence: presenceData,
          },
        );
      });

      test('should handle presence update for non-existent user', () => {
        expect(() => {
          collaborationService.updateUserPresence('non-existent-user', {});
        }).toThrow('User not found in current session');
      });
    });
  });

  describe('Provider Integration', () => {
    describe('enableCollaboration', () => {
      test('should switch to collaborative provider', async () => {
        const sessionId = 'session-789';
        const serverUrl = 'https://collaboration.test.com';
        const mapData = { notes: [], connections: [] };

        mockDataProviderService.enableCollaboration.mockResolvedValue(true);
        mockDataProviderService.getSnapshot.mockReturnValue({ data: mapData });

        const result = await collaborationService.enableCollaboration(
          sessionId,
          serverUrl,
        );

        expect(result).toEqual({ success: true, sessionId, serverUrl });
        expect(
          mockDataProviderService.enableCollaboration,
        ).toHaveBeenCalledWith(serverUrl, sessionId);
        expect(collaborationService.isCollaborationActive()).toBe(true);
      });

      test('should emit collaboration.enabled event', async () => {
        const sessionId = 'session-789';
        const serverUrl = 'https://test.com';

        mockDataProviderService.enableCollaboration.mockResolvedValue(true);

        await collaborationService.enableCollaboration(sessionId, serverUrl);

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'collaboration.enabled',
          {
            sessionId,
            serverUrl,
            providerType: 'yjs',
          },
        );
      });

      test('should handle provider switching failure', async () => {
        const sessionId = 'session-789';
        const serverUrl = 'https://test.com';

        mockDataProviderService.enableCollaboration.mockResolvedValue(false);

        await expect(
          collaborationService.enableCollaboration(sessionId, serverUrl),
        ).rejects.toThrow('Failed to enable collaboration mode');

        expect(collaborationService.isCollaborationActive()).toBe(false);
      });

      test('should validate required parameters', async () => {
        await expect(
          collaborationService.enableCollaboration(),
        ).rejects.toThrow('sessionId is required');

        await expect(
          collaborationService.enableCollaboration('session-123'),
        ).rejects.toThrow('serverUrl is required');
      });

      test('should preserve existing map data during switch', async () => {
        const sessionId = 'session-789';
        const serverUrl = 'https://test.com';
        const existingData = {
          notes: [{ id: '1', content: 'existing note' }],
          connections: [],
        };

        mockDataProviderService.getSnapshot.mockReturnValue({
          data: existingData,
        });
        mockDataProviderService.enableCollaboration.mockResolvedValue(true);

        await collaborationService.enableCollaboration(sessionId, serverUrl);

        // Should have called getSnapshot to preserve data
        expect(mockDataProviderService.getSnapshot).toHaveBeenCalled();
      });
    });

    describe('disableCollaboration', () => {
      beforeEach(async () => {
        // Set up collaboration mode
        mockDataProviderService.enableCollaboration.mockResolvedValue(true);
        await collaborationService.enableCollaboration(
          'session-123',
          'https://test.com',
        );
      });

      test('should switch back to local provider', async () => {
        mockDataProviderService.disableCollaboration.mockResolvedValue(true);

        const result = await collaborationService.disableCollaboration();

        expect(result).toEqual({ success: true });
        expect(mockDataProviderService.disableCollaboration).toHaveBeenCalled();
        expect(collaborationService.isCollaborationActive()).toBe(false);
      });

      test('should emit collaboration.disabled event', async () => {
        mockDataProviderService.disableCollaboration.mockResolvedValue(true);

        await collaborationService.disableCollaboration();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'collaboration.disabled',
          {
            sessionId: expect.any(String),
            providerType: 'local',
          },
        );
      });

      test('should handle provider switching failure', async () => {
        mockDataProviderService.disableCollaboration.mockResolvedValue(false);

        await expect(
          collaborationService.disableCollaboration(),
        ).rejects.toThrow('Failed to disable collaboration mode');
      });

      test('should preserve map data during switch', async () => {
        const collaborativeData = {
          notes: [{ id: '1', content: 'collaborative note' }],
          connections: [],
        };

        mockDataProviderService.getSnapshot.mockReturnValue({
          data: collaborativeData,
        });
        mockDataProviderService.disableCollaboration.mockResolvedValue(true);

        await collaborationService.disableCollaboration();

        expect(mockDataProviderService.getSnapshot).toHaveBeenCalled();
      });
    });

    describe('getProviderStatus', () => {
      test('should return local provider status when not collaborating', () => {
        mockDataProviderService.getProviderType.mockReturnValue('local');
        mockDataProviderService.isCollaborationEnabled.mockReturnValue(false);

        const status = collaborationService.getProviderStatus();

        expect(status).toEqual({
          type: 'local',
          collaborationEnabled: false,
          sessionId: null,
        });
      });

      test('should return collaborative provider status when collaborating', async () => {
        // Set up collaboration
        mockDataProviderService.enableCollaboration.mockResolvedValue(true);
        mockDataProviderService.getProviderType.mockReturnValue('yjs');
        mockDataProviderService.isCollaborationEnabled.mockReturnValue(true);

        await collaborationService.enableCollaboration(
          'session-123',
          'https://test.com',
        );

        const status = collaborationService.getProviderStatus();

        expect(status).toEqual({
          type: 'yjs',
          collaborationEnabled: true,
          sessionId: 'session-123',
        });
      });
    });

    describe('subscribeToProviderEvents', () => {
      test('should subscribe to data provider change events', () => {
        const mockCallback = jest.fn();

        const unsubscribe =
          collaborationService.subscribeToProviderEvents(mockCallback);

        expect(typeof unsubscribe).toBe('function');
        expect(
          mockDataProviderService.subscribe || mockEventBus.on,
        ).toHaveBeenCalled();
      });

      test('should handle provider change events', () => {
        const mockCallback = jest.fn();
        let providerEventCallback;

        // Capture the callback passed to provider subscription
        mockDataProviderService.subscribe = jest.fn((callback) => {
          providerEventCallback = callback;
          return jest.fn(); // unsubscribe function
        });

        collaborationService.subscribeToProviderEvents(mockCallback);

        // Simulate a provider change event
        const changeEvent = {
          type: 'notes',
          origin: 'remote_user',
          payload: { id: 'note-123' },
        };

        providerEventCallback(changeEvent);

        expect(mockCallback).toHaveBeenCalledWith(changeEvent);
      });
    });
  });

  describe('Error Handling', () => {
    describe('Network Error Recovery', () => {
      test('should handle server connection failures gracefully', async () => {
        const sessionId = 'session-fail';
        const serverUrl = 'https://unreachable.server.com';

        mockDataProviderService.enableCollaboration.mockRejectedValue(
          new Error('Network connection failed'),
        );

        await expect(
          collaborationService.enableCollaboration(sessionId, serverUrl),
        ).rejects.toThrow('Network connection failed');

        // Should not be in collaboration mode after failure
        expect(collaborationService.isCollaborationActive()).toBe(false);
        expect(collaborationService.getCurrentSession()).toBeNull();
      });

      test('should emit error events for failed operations', async () => {
        const sessionId = 'session-fail';
        const serverUrl = 'https://test.com';
        const error = new Error('Connection timeout');

        mockDataProviderService.enableCollaboration.mockRejectedValue(error);

        try {
          await collaborationService.enableCollaboration(sessionId, serverUrl);
        } catch (e) {
          // Expected to throw
        }

        expect(mockEventBus.emit).toHaveBeenCalledWith('collaboration.error', {
          type: 'enable_failed',
          error: error.message,
          sessionId,
          serverUrl,
        });
      });
    });

    describe('Session State Validation', () => {
      test('should validate session state consistency', async () => {
        // Create a session
        await collaborationService.createSession('test-map', {
          serverUrl: 'https://test.com',
          userInfo: { id: 'user-123', name: 'Test User' },
        });

        // Simulate external session state corruption
        collaborationService._currentSession = null;

        expect(() => {
          collaborationService.validateSessionState();
        }).toThrow('Session state inconsistency detected');
      });

      test('should handle corrupted session data', () => {
        // Simulate corrupted session data
        collaborationService._currentSession = {
          id: 'session-123',
          // Missing required fields
        };

        expect(() => {
          collaborationService.validateSessionData();
        }).toThrow('Invalid session data structure');
      });
    });

    describe('Resource Cleanup on Errors', () => {
      test('should cleanup resources after failed session creation', async () => {
        const cleanupSpy = jest.fn();
        collaborationService._addCleanupFunction(cleanupSpy);

        // Simulate session creation failure
        mockDataProviderService.enableCollaboration.mockRejectedValue(
          new Error('Server error'),
        );

        try {
          await collaborationService.createSession('test-map', {
            serverUrl: 'https://test.com',
            userInfo: { id: 'user-123' },
          });
        } catch (e) {
          // Expected to fail
        }

        // Cleanup should have been called
        expect(cleanupSpy).toHaveBeenCalled();
      });

      test('should prevent memory leaks on repeated errors', async () => {
        const initialMemoryUsage = process.memoryUsage().heapUsed;

        // Simulate multiple failed operations
        for (let i = 0; i < 100; i++) {
          try {
            await collaborationService.enableCollaboration(
              `session-${i}`,
              'https://fail.com',
            );
          } catch (e) {
            // Expected to fail
          }
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemoryUsage = process.memoryUsage().heapUsed;
        const memoryGrowth = finalMemoryUsage - initialMemoryUsage;

        // Memory growth should be minimal (less than 10MB)
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
      });
    });

    describe('Concurrent Operation Handling', () => {
      test('should handle concurrent session operations safely', async () => {
        const sessionPromises = [];

        // Try to create multiple sessions concurrently
        for (let i = 0; i < 5; i++) {
          sessionPromises.push(
            collaborationService
              .createSession(`map-${i}`, {
                serverUrl: 'https://test.com',
                userInfo: { id: `user-${i}` },
              })
              .catch((err) => err),
          );
        }

        const results = await Promise.all(sessionPromises);

        // Only one should succeed, others should fail gracefully
        const successes = results.filter((r) => r && !r.message);
        const failures = results.filter((r) => r && r.message);

        expect(successes).toHaveLength(1);
        expect(failures).toHaveLength(4);
        expect(failures[0]).toEqual(
          expect.objectContaining({
            message: expect.stringContaining('Session already active'),
          }),
        );
      });

      test('should handle rapid enable/disable cycles', async () => {
        const cycles = [];

        for (let i = 0; i < 10; i++) {
          cycles.push(async () => {
            try {
              await collaborationService.enableCollaboration(
                `session-${i}`,
                'https://test.com',
              );
              await collaborationService.disableCollaboration();
            } catch (error) {
              return error;
            }
          });
        }

        const results = await Promise.all(cycles.map((cycle) => cycle()));

        // Should handle all cycles without throwing unhandled errors
        results.forEach((result) => {
          if (result instanceof Error) {
            expect(result.message).toMatch(
              /Session already active|Failed to enable|Failed to disable/,
            );
          }
        });
      });
    });

    describe('Data Validation', () => {
      test('should validate user info structure', async () => {
        const invalidUserInfo = [
          null,
          undefined,
          {},
          { name: 'Test' }, // missing id
          { id: 'user-123' }, // missing name
          { id: '', name: 'Test' }, // empty id
          { id: 'user-123', name: '' }, // empty name
        ];

        for (const userInfo of invalidUserInfo) {
          await expect(
            collaborationService.createSession('test-map', {
              serverUrl: 'https://test.com',
              userInfo,
            }),
          ).rejects.toThrow(/userInfo|invalid|required/i);
        }
      });

      test('should validate server URL format', async () => {
        const invalidUrls = [
          'not-a-url',
          'ftp://invalid.protocol.com',
          'http://',
          'https://',
          'javascript:alert("xss")',
          '',
        ];

        for (const serverUrl of invalidUrls) {
          await expect(
            collaborationService.enableCollaboration('session-123', serverUrl),
          ).rejects.toThrow(/serverUrl|invalid|required/i);
        }
      });

      test('should validate session ID format', async () => {
        const invalidSessionIds = [
          '',
          null,
          undefined,
          123, // number instead of string
          {}, // object instead of string
          'session with spaces',
          'session/with/slashes',
        ];

        for (const sessionId of invalidSessionIds) {
          await expect(
            collaborationService.joinSession(
              sessionId,
              { id: 'user-123', name: 'Test' },
              'https://test.com',
            ),
          ).rejects.toThrow(/sessionId|invalid|required/i);
        }
      });
    });

    describe('Timeout Handling', () => {
      test('should timeout long-running operations', async () => {
        jest.setTimeout(10000); // 10 second timeout for this test

        // Mock a slow response
        mockDataProviderService.enableCollaboration.mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 15000)), // 15 second delay
        );

        await expect(
          collaborationService.enableCollaboration(
            'session-123',
            'https://test.com',
          ),
        ).rejects.toThrow(/timeout|timed out/i);
      });

      test('should cleanup after timeout', async () => {
        const cleanupSpy = jest.fn();
        collaborationService._addCleanupFunction(cleanupSpy);

        mockDataProviderService.enableCollaboration.mockImplementation(
          () => new Promise(() => {}), // Never resolves
        );

        try {
          await collaborationService.enableCollaboration(
            'session-123',
            'https://test.com',
          );
        } catch (e) {
          // Expected timeout
        }

        expect(cleanupSpy).toHaveBeenCalled();
      });
    });
  });
});
