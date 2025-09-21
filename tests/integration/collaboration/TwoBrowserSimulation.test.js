// tests/integration/collaboration/TwoBrowserSimulation.test.js
// TDD Integration Tests for Multi-Device Collaboration - Mock WebSocket simulation

import { jest } from '@jest/globals';

describe('Multi-Device Collaboration TDD', () => {
  let MockCollaborationClient;
  let MockWebSocketServer;
  let mockServer;

  beforeEach(async () => {
    // Reset modules to avoid cached imports
    jest.resetModules();

    // Mock WebSocket server for collaboration testing
    MockWebSocketServer = jest.fn().mockImplementation(() => ({
      clients: new Map(),
      rooms: new Map(),
      connect: jest.fn(),
      broadcast: jest.fn(),
      handleMessage: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock collaboration client (doesn't exist yet - TDD RED phase)
    jest.doMock('../../../src/js/testing/MockCollaborationClient.js', () => ({
      MockCollaborationClient: class MockCollaborationClient {
        constructor(userId) {
          this.userId = userId;
          this.connected = false;
          this.mapId = null;
          this.notes = new Map();
          this.connections = new Map();
          this.wsProvider = null;
        }

        async loadMap(mapId) {
          throw new Error('loadMap not implemented');
        }

        async createNote(noteData) {
          throw new Error('createNote not implemented');
        }

        async editNote(noteId, content) {
          throw new Error('editNote not implemented');
        }

        async deleteNote(noteId) {
          throw new Error('deleteNote not implemented');
        }

        waitForSync() {
          throw new Error('waitForSync not implemented');
        }

        getNotes() {
          throw new Error('getNotes not implemented');
        }

        getNoteContent(noteId) {
          throw new Error('getNoteContent not implemented');
        }

        disconnect() {
          throw new Error('disconnect not implemented');
        }
      },
    }));

    // Import after mocking
    const clientModule = await import(
      '../../../src/js/testing/MockCollaborationClient.js'
    );
    MockCollaborationClient = clientModule.MockCollaborationClient;

    // Setup mock server
    mockServer = new MockWebSocketServer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Two-Client Collaboration (Phase 2)', () => {
    test('should sync note creation between two clients', async () => {
      // RED: Core collaboration requirement
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await client1.loadMap('shared-map');
      await client2.loadMap('shared-map');

      // User 1 creates note
      const noteData = {
        content: 'Hello World',
        pos: [100, 200],
        color: 'yellow',
      };
      const noteId = await client1.createNote(noteData);

      // User 2 should see the note after sync
      await client2.waitForSync();
      const notes = client2.getNotes();

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(noteId);
      expect(notes[0].content).toBe('Hello World');
      expect(notes[0].pos).toEqual([100, 200]);
      expect(notes[0].color).toBe('yellow');
    });

    test('should sync note editing between clients', async () => {
      // RED: Real-time editing sync
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      // User 1 creates and edits note
      const noteId = await client1.createNote({ content: 'Initial content' });
      await client1.editNote(noteId, 'Updated by user 1');

      // User 2 should see the updated content
      await client2.waitForSync();
      const noteContent = client2.getNoteContent(noteId);

      expect(noteContent).toBe('Updated by user 1');
    });

    test('should sync note deletion between clients', async () => {
      // RED: Deletion synchronization
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      // User 1 creates note
      const noteId = await client1.createNote({ content: 'To be deleted' });
      await client2.waitForSync();

      // Verify both clients have the note
      expect(client2.getNotes()).toHaveLength(1);

      // User 1 deletes note
      await client1.deleteNote(noteId);

      // User 2 should see the deletion
      await client2.waitForSync();
      expect(client2.getNotes()).toHaveLength(0);
    });
  });

  describe('Concurrent Operations (Phase 2)', () => {
    test('should handle concurrent note creation without conflicts', async () => {
      // RED: Concurrent creation handling
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      // Both users create notes simultaneously
      const [note1Id, note2Id] = await Promise.all([
        client1.createNote({ content: 'Note from user 1', pos: [100, 100] }),
        client2.createNote({ content: 'Note from user 2', pos: [200, 200] }),
      ]);

      // Wait for sync
      await Promise.all([client1.waitForSync(), client2.waitForSync()]);

      // Both clients should see both notes
      const client1Notes = client1.getNotes();
      const client2Notes = client2.getNotes();

      expect(client1Notes).toHaveLength(2);
      expect(client2Notes).toHaveLength(2);

      // Verify note integrity
      const note1 = client1Notes.find((n) => n.id === note1Id);
      const note2 = client2Notes.find((n) => n.id === note2Id);

      expect(note1.content).toBe('Note from user 1');
      expect(note2.content).toBe('Note from user 2');
    });

    test('should handle concurrent edits with CRDT conflict resolution', async () => {
      // RED: CRDT conflict resolution
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      // Create shared note
      const noteId = await client1.createNote({ content: 'Original' });
      await client2.waitForSync();

      // Both users edit simultaneously
      await Promise.all([
        client1.editNote(noteId, 'Version A'),
        client2.editNote(noteId, 'Version B'),
      ]);

      // Wait for conflict resolution
      await Promise.all([client1.waitForSync(), client2.waitForSync()]);

      // Y.Text should resolve conflict deterministically
      const finalContent1 = client1.getNoteContent(noteId);
      const finalContent2 = client2.getNoteContent(noteId);

      expect(finalContent1).toBe(finalContent2); // Consistent state
      expect(finalContent1).toMatch(/Version [AB]/); // Contains one version
    });

    test('should handle rapid sequential edits', async () => {
      // RED: Rapid edit sequence handling
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      const noteId = await client1.createNote({ content: 'Start' });
      await client2.waitForSync();

      // User 1 makes rapid edits
      for (let i = 1; i <= 5; i++) {
        await client1.editNote(noteId, `Edit ${i}`);
      }

      // User 2 should eventually see final state
      await client2.waitForSync();
      const finalContent = client2.getNoteContent(noteId);

      expect(finalContent).toBe('Edit 5');
    });
  });

  describe('Multi-Client Scenarios (Phase 2)', () => {
    test('should support three or more concurrent clients', async () => {
      // RED: Multi-client scalability
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');
      const client3 = new MockCollaborationClient('user3');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
        client3.loadMap('shared-map'),
      ]);

      // Each client creates a note
      const [note1Id, note2Id, note3Id] = await Promise.all([
        client1.createNote({ content: 'Client 1 note' }),
        client2.createNote({ content: 'Client 2 note' }),
        client3.createNote({ content: 'Client 3 note' }),
      ]);

      // All clients sync
      await Promise.all([
        client1.waitForSync(),
        client2.waitForSync(),
        client3.waitForSync(),
      ]);

      // Every client should see all notes
      [client1, client2, client3].forEach((client) => {
        const notes = client.getNotes();
        expect(notes).toHaveLength(3);
      });
    });

    test('should handle client disconnection and reconnection', async () => {
      // RED: Connection resilience
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      // Client 1 creates note
      const noteId = await client1.createNote({ content: 'Before disconnect' });
      await client2.waitForSync();

      // Client 2 disconnects
      client2.disconnect();

      // Client 1 makes changes while client 2 is offline
      await client1.editNote(noteId, 'Changed while offline');

      // Client 2 reconnects
      await client2.loadMap('shared-map');
      await client2.waitForSync();

      // Client 2 should see the changes made while offline
      const content = client2.getNoteContent(noteId);
      expect(content).toBe('Changed while offline');
    });

    test('should maintain consistency with late-joining clients', async () => {
      // RED: Late join consistency
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      // Client 1 starts working alone
      await client1.loadMap('shared-map');
      const note1Id = await client1.createNote({ content: 'Early note 1' });
      const note2Id = await client1.createNote({ content: 'Early note 2' });

      // Client 2 joins later
      await client2.loadMap('shared-map');
      await client2.waitForSync();

      // Client 2 should see all existing work
      const notes = client2.getNotes();
      expect(notes).toHaveLength(2);
      expect(notes.find((n) => n.id === note1Id).content).toBe('Early note 1');
      expect(notes.find((n) => n.id === note2Id).content).toBe('Early note 2');
    });
  });

  describe('Error Handling and Recovery (Phase 2)', () => {
    test('should handle WebSocket connection failures', async () => {
      // RED: Connection failure resilience
      const client1 = new MockCollaborationClient('user1');

      // Simulate connection failure during loadMap
      mockServer.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(client1.loadMap('shared-map')).rejects.toThrow(
        'Connection failed',
      );
    });

    test('should recover from temporary network issues', async () => {
      // RED: Network resilience
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      // Simulate network interruption
      client1.simulateNetworkFailure();

      // Client 1 makes changes during network issue (should queue)
      const noteId = await client1.createNote({ content: 'Offline note' });

      // Network recovers
      client1.simulateNetworkRecovery();
      await client1.waitForSync();

      // Client 2 should eventually see the changes
      await client2.waitForSync();
      const notes = client2.getNotes();
      expect(notes.some((n) => n.content === 'Offline note')).toBe(true);
    });

    test('should handle malformed collaboration messages', async () => {
      // RED: Message corruption handling
      const client1 = new MockCollaborationClient('user1');

      await client1.loadMap('shared-map');

      // Simulate receiving malformed message
      const malformedMessage = { invalid: 'structure' };

      expect(() => {
        client1.handleCollaborationMessage(malformedMessage);
      }).not.toThrow();

      // Client should remain functional
      const noteId = await client1.createNote({ content: 'Still works' });
      expect(noteId).toBeDefined();
    });
  });

  describe('Performance and Optimization (Phase 2)', () => {
    test('should handle large numbers of operations efficiently', async () => {
      // RED: Performance under load
      const client1 = new MockCollaborationClient('user1');
      const client2 = new MockCollaborationClient('user2');

      await Promise.all([
        client1.loadMap('shared-map'),
        client2.loadMap('shared-map'),
      ]);

      const startTime = Date.now();

      // Create many notes rapidly
      const notePromises = [];
      for (let i = 0; i < 100; i++) {
        notePromises.push(
          client1.createNote({ content: `Note ${i}`, pos: [i * 10, i * 10] }),
        );
      }

      await Promise.all(notePromises);
      await client2.waitForSync();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(client2.getNotes()).toHaveLength(100);
    });

    test('should optimize bandwidth usage for large operations', async () => {
      // RED: Bandwidth optimization
      const client1 = new MockCollaborationClient('user1');

      await client1.loadMap('shared-map');

      // Track bandwidth usage
      const initialBandwidth = client1.getBandwidthUsage();

      // Perform large operation
      const largeContent = 'x'.repeat(10000); // 10KB content
      await client1.createNote({ content: largeContent });

      const finalBandwidth = client1.getBandwidthUsage();
      const bandwidthUsed = finalBandwidth - initialBandwidth;

      // Should use minimal bandwidth (Y.js binary encoding)
      expect(bandwidthUsed).toBeLessThan(15000); // Should be close to content size
    });
  });
});
