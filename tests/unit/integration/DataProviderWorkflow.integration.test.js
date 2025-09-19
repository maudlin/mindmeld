// tests/unit/integration/DataProviderWorkflow.integration.test.js
// End-to-end integration tests for DataProvider abstraction workflow

import { jest } from '@jest/globals';

describe('DataProvider Workflow Integration Tests', () => {
  let DataProviderService;
  let noteDeletion;
  let LocalJSONProvider;
  let mockProvider;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Setup DOM
    document.body.innerHTML = `
      <div id="canvas">
        <div id="note-1" class="note">Test Note 1</div>
        <div id="note-2" class="note">Test Note 2</div>
      </div>
      <input type="file" id="fileInput" style="display: none;" />
    `;

    // Mock LocalJSONProvider
    mockProvider = {
      init: jest.fn(() => jest.fn()), // returns cleanup function
      destroy: jest.fn(),
      subscribe: jest.fn(() => jest.fn()), // returns unsubscribe function
      getSnapshot: jest.fn(() => ({
        data: {
          n: [
            {
              id: 'note-1',
              content: 'Test Note 1',
              left: '100px',
              top: '200px',
            },
            {
              id: 'note-2',
              content: 'Test Note 2',
              left: '300px',
              top: '400px',
            },
          ],
          c: [{ from: 'note-1', to: 'note-2', type: 1 }],
        },
      })),
      importJSON: jest.fn(),
      exportJSON: jest.fn(() =>
        JSON.stringify({
          data: {
            n: [
              {
                id: 'note-1',
                content: 'Test Note 1',
                left: '100px',
                top: '200px',
              },
              {
                id: 'note-2',
                content: 'Test Note 2',
                left: '300px',
                top: '400px',
              },
            ],
            c: [{ from: 'note-1', to: 'note-2', type: 1 }],
          },
        }),
      ),
      upsertNote: jest.fn(),
      deleteNote: jest.fn(),
      upsertConnection: jest.fn(),
      deleteConnection: jest.fn(),
      setMeta: jest.fn(),
      getMeta: jest.fn(() => ({
        zoomLevel: 5,
        canvasType: 'Standard Canvas',
        mapName: 'Test Workflow Map',
      })),
      pauseAutosave: jest.fn(),
      resumeAutosave: jest.fn(),
      hydrationInProgress: false,
    };

    LocalJSONProvider = jest.fn().mockImplementation(() => mockProvider);

    // Mock other dependencies
    const mockNoteManager = {
      getSelectedNotes: jest.fn(() => [
        { id: 'note-1', remove: jest.fn() },
        { id: 'note-2', remove: jest.fn() },
      ]),
    };

    const mockDeleteConnectionsByNote = jest.fn();
    const mockConnectionManager = {
      updateConnections: jest.fn(),
    };

    // Mock canvas utilities (inline where needed)

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
        readText: jest.fn(() =>
          Promise.resolve(
            JSON.stringify({
              data: {
                n: [
                  {
                    id: 'imported-note',
                    content: 'Imported Note',
                    left: '50px',
                    top: '50px',
                  },
                ],
                c: [],
              },
            }),
          ),
        ),
      },
    });

    // Mock file operations
    global.URL = {
      createObjectURL: jest.fn(() => 'mock-blob-url'),
      revokeObjectURL: jest.fn(),
    };

    // Mock the imports
    jest.doMock('../../../src/js/data/providers/LocalJSONProvider.js', () => ({
      LocalJSONProvider,
    }));
    jest.doMock('../../../src/js/services/noteManager.js', () => ({
      noteManager: mockNoteManager,
    }));
    jest.doMock('../../../src/js/features/connection/connection.js', () => ({
      deleteConnectionsByNote: mockDeleteConnectionsByNote,
    }));
    jest.doMock(
      '../../../src/js/features/connection/connectionManager.js',
      () => ({
        connectionManager: mockConnectionManager,
      }),
    );
    // Canvas utilities are handled inline - no separate module to mock

    // Import modules after mocking
    const dataProviderModule = await import(
      '../../../src/js/services/DataProviderService.js'
    );
    DataProviderService = dataProviderModule.DataProviderService;

    const noteDeletionModule = await import(
      '../../../src/js/features/note/noteDeletion.js'
    );
    noteDeletion = noteDeletionModule;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    // Reset singleton safely
    try {
      if (DataProviderService && DataProviderService._instance) {
        delete DataProviderService._instance;
      }
    } catch (error) {
      // Ignore cleanup errors - module may not be loaded
    }
  });

  describe('Core DataProvider Integration', () => {
    test('should share same DataProviderService instance across all components', () => {
      // Get service instances from different access points
      const service1 = DataProviderService.getInstance();
      const service2 = DataProviderService.getInstance();

      // Both should be the same singleton instance
      expect(service1).toBe(service2);
      expect(LocalJSONProvider).toHaveBeenCalledTimes(1); // Only one provider instance created
    });

    test('should coordinate data operations across components', () => {
      // Step 1: Get service and perform export operation
      const service = DataProviderService.getInstance();
      service.exportJSON();

      // Step 2: Delete notes via NoteDeletion (different component)
      noteDeletion.deleteNote();

      // Verify both operations used the same DataProvider
      expect(mockProvider.exportJSON).toHaveBeenCalled();
      expect(mockProvider.deleteNote).toHaveBeenCalledWith('note-1', {
        origin: 'user',
      });
      expect(mockProvider.deleteNote).toHaveBeenCalledWith('note-2', {
        origin: 'user',
      });
    });

    test('should maintain service state across multiple component operations', async () => {
      const service = DataProviderService.getInstance();

      // Operation 1: Export
      service.exportJSON();

      // Operation 2: Delete via different component
      noteDeletion.deleteNote();

      // Operation 3: Import
      await service.importJSON('{"data":{"n":[],"c":[]}}');

      // All operations should use the same service instance
      expect(mockProvider.exportJSON).toHaveBeenCalled();
      expect(mockProvider.deleteNote).toHaveBeenCalledTimes(2); // 2 notes deleted
      expect(mockProvider.importJSON).toHaveBeenCalled();
    });

    test('should handle error propagation across component boundaries', () => {
      // Make provider throw an error for deleteNote
      mockProvider.deleteNote.mockImplementation(() => {
        throw new Error('Provider deletion failed');
      });

      // Deletion should handle error gracefully (error caught in component)
      expect(() => noteDeletion.deleteNote()).not.toThrow();

      // Other operations should still work
      const service = DataProviderService.getInstance();
      service.exportJSON();
      expect(mockProvider.exportJSON).toHaveBeenCalled();
    });
  });

  describe('Service Lifecycle Integration', () => {
    test('should handle service initialization across component boundaries', () => {
      // First component access - direct service call
      const service = DataProviderService.getInstance();
      service.exportJSON();

      // Second component access - via NoteDeletion
      noteDeletion.deleteNote();

      // Both should succeed and use the same provider
      expect(mockProvider.exportJSON).toHaveBeenCalled();
      expect(mockProvider.deleteNote).toHaveBeenCalled();
      expect(LocalJSONProvider).toHaveBeenCalledTimes(1);
    });

    test('should support concurrent operations from multiple components', async () => {
      const service = DataProviderService.getInstance();

      // Simulate concurrent operations
      const exportPromise = Promise.resolve(service.exportJSON());
      const deletePromise = Promise.resolve(noteDeletion.deleteNote());
      const importPromise = Promise.resolve(
        service.importJSON('{"data":{"n":[],"c":[]}}'),
      );

      // Wait for all operations to complete
      await Promise.all([exportPromise, deletePromise, importPromise]);

      // Verify all operations completed successfully
      expect(mockProvider.exportJSON).toHaveBeenCalled();
      expect(mockProvider.deleteNote).toHaveBeenCalledTimes(2); // 2 notes
      expect(mockProvider.importJSON).toHaveBeenCalled();
    });
  });

  describe('Data Flow Integration', () => {
    test('should maintain data integrity through complete CRUD workflow', async () => {
      const service = DataProviderService.getInstance();

      // Step 1: Read (export current state)
      service.exportJSON();
      expect(mockProvider.exportJSON).toHaveBeenCalled();

      // Step 2: Delete (remove notes)
      noteDeletion.deleteNote();
      expect(mockProvider.deleteNote).toHaveBeenCalledTimes(2);

      // Step 3: Create (import new data)
      await service.importJSON('{"data":{"n":[{"id":"new-note"}],"c":[]}}');
      expect(mockProvider.importJSON).toHaveBeenCalled();

      // Step 4: Read again (verify state)
      service.exportJSON();
      expect(mockProvider.exportJSON).toHaveBeenCalledTimes(2);

      // All operations should use the same DataProvider instance
      expect(LocalJSONProvider).toHaveBeenCalledTimes(1);
    });

    test('should handle mixed operations with proper origin tracking', () => {
      // User-initiated operations
      noteDeletion.deleteNote(); // Should use origin: 'user'

      // Verify origin tracking
      expect(mockProvider.deleteNote).toHaveBeenCalledWith('note-1', {
        origin: 'user',
      });
      expect(mockProvider.deleteNote).toHaveBeenCalledWith('note-2', {
        origin: 'user',
      });
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from partial operation failures', () => {
      // Make one operation fail
      mockProvider.deleteNote.mockImplementationOnce(() => {
        throw new Error('Delete operation failed');
      });

      // Operations should continue despite individual failures
      noteDeletion.deleteNote(); // Should handle deletion error gracefully

      const service = DataProviderService.getInstance();
      service.exportJSON(); // Should still work

      expect(mockProvider.exportJSON).toHaveBeenCalled();
    });

    test('should maintain service availability after component errors', () => {
      // Create spy for original getInstance
      const originalGetInstance = DataProviderService.getInstance;

      // Force a service error temporarily
      DataProviderService.getInstance = jest.fn(() => {
        throw new Error('Service unavailable');
      });

      // Operations should handle service unavailability gracefully
      expect(() => noteDeletion.deleteNote()).not.toThrow();

      // Reset service and verify recovery
      DataProviderService.getInstance = originalGetInstance;

      const service = DataProviderService.getInstance();
      service.exportJSON();

      expect(mockProvider.exportJSON).toHaveBeenCalled();
    });
  });
});
