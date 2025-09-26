/**
 * Integration test for note persistence behavior
 * Tests that ALL notes persist correctly through DataProvider architecture
 */

import { DataProviderService } from '../../../src/js/services/DataProviderService.js';
import { persistenceService } from '../../../src/js/services/PersistenceService.js';
import { NoteIdService } from '../../../src/js/services/noteIdService.js';
import { appState } from '../../../src/js/data/observableState.js';

describe('Note Persistence Integration', () => {
  let dataProvider;
  let mockCanvas;

  beforeEach(async () => {
    // Set up DOM
    mockCanvas = document.createElement('div');
    mockCanvas.id = 'canvas';
    document.body.appendChild(mockCanvas);

    // Mock document.querySelector to return our canvas
    global.document.querySelector = jest.fn((selector) => {
      if (selector === '#canvas') return mockCanvas;
      return null;
    });

    // Clear PersistenceService state
    persistenceService.clear();

    // Clear appState to prevent test contamination
    appState.setState(
      {
        notes: [],
        connections: [],
        zoomLevel: 5,
        colorState: { currentColor: 'yellow', notes: {} },
      },
      true,
    ); // silent to avoid autosave

    // Reset NoteIdService counter
    NoteIdService.reset();

    // Get fresh DataProvider instance
    dataProvider = DataProviderService.getInstance();

    // Wait a bit to ensure any pending debounced operations from previous tests complete
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Clear again after pending operations complete
    persistenceService.clear();
    appState.setState(
      {
        notes: [],
        connections: [],
        zoomLevel: 5,
        colorState: { currentColor: 'yellow', notes: {} },
      },
      true,
    ); // silent to avoid autosave
  });

  afterEach(() => {
    document.body.removeChild(mockCanvas);
    jest.restoreAllMocks();
  });

  test('should maintain complete note persistence through restoration and user interaction cycles', async () => {
    // Given: We start with some existing notes (simulating restored state)
    const existingNotes = [
      { id: 'note-A', content: 'First note', left: '100px', top: '100px' },
      { id: 'note-B', content: 'Second note', left: '200px', top: '200px' },
      { id: 'note-C', content: 'Third note', left: '300px', top: '300px' },
    ];

    // Simulate having existing notes in storage (like after a page load)
    // Use DataProvider to create the existing notes to ensure proper state sync
    existingNotes.forEach((note) =>
      dataProvider.upsertNote(
        {
          id: note.id,
          content: note.content,
          pos: [parseFloat(note.left), parseFloat(note.top)],
        },
        { origin: 'system' },
      ),
    );

    // Wait for system save to complete
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Initialize NoteIdService with existing IDs (like DataBootstrap does)
    NoteIdService.ensureUniqueIds(existingNotes);

    // When: User creates additional notes through DataProvider
    const newNote1 = {
      id: NoteIdService.generateNextId(),
      content: 'User note 1',
      pos: [400, 400],
    };
    const newNote2 = {
      id: NoteIdService.generateNextId(),
      content: 'User note 2',
      pos: [500, 500],
    };

    dataProvider.upsertNote(newNote1);
    dataProvider.upsertNote(newNote2);

    // Wait for debounced autosave to complete (300ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Then: All notes should be persisted (original + new)
    const persistedState = persistenceService.getState();
    expect(persistedState.notes).toHaveLength(5);

    // Original notes should still be there
    expect(persistedState.notes.find((n) => n.id === 'note-A')).toBeDefined();
    expect(persistedState.notes.find((n) => n.id === 'note-B')).toBeDefined();
    expect(persistedState.notes.find((n) => n.id === 'note-C')).toBeDefined();

    // New notes should be there with unique IDs
    expect(
      persistedState.notes.find((n) => n.id === newNote1.id),
    ).toBeDefined();
    expect(
      persistedState.notes.find((n) => n.id === newNote2.id),
    ).toBeDefined();

    // Verify no ID collisions occurred
    const allIds = persistedState.notes.map((n) => n.id);
    const uniqueIds = [...new Set(allIds)];
    expect(allIds).toHaveLength(uniqueIds.length);
  });

  test('should sync notes to persistence layer after autosave completes', async () => {
    // Given: Empty state
    expect(persistenceService.getState().notes).toHaveLength(0);

    // When: We add a note through DataProvider
    const testNote = {
      id: 'test-123',
      content: 'Test content',
      pos: [150, 250],
    };
    dataProvider.upsertNote(testNote);

    // Wait for debounced autosave to complete (300ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Then: The note should be available in persistence layer
    const persistedState = persistenceService.getState();
    expect(persistedState.notes).toHaveLength(1);
    expect(persistedState.notes[0]).toEqual(
      expect.objectContaining({
        id: 'test-123',
        content: 'Test content',
        left: '150px',
        top: '250px',
      }),
    );
  });

  test('should maintain note data integrity during CRUD operations', async () => {
    // Given: Notes with specific content and positions
    const originalNotes = [
      {
        id: 'data-1',
        content: 'Original content 1',
        pos: [10, 20],
      },
      {
        id: 'data-2',
        content: 'Original content 2',
        pos: [30, 40],
      },
    ];

    // When: We add notes through DataProvider
    originalNotes.forEach((note) => dataProvider.upsertNote(note));

    // Wait for debounced autosave to complete (300ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Then: PersistenceService should contain exact note data
    const persistedState = persistenceService.getState();
    expect(persistedState.notes).toHaveLength(2);

    const note1 = persistedState.notes.find((n) => n.id === 'data-1');
    const note2 = persistedState.notes.find((n) => n.id === 'data-2');

    expect(note1).toEqual(
      expect.objectContaining({
        id: 'data-1',
        content: 'Original content 1',
        left: '10px',
        top: '20px',
      }),
    );
    expect(note2).toEqual(
      expect.objectContaining({
        id: 'data-2',
        content: 'Original content 2',
        left: '30px',
        top: '40px',
      }),
    );
  });

  test('should prevent ID collisions when existing notes are restored (FIFO bug verification)', async () => {
    // Given: Existing notes from a previous session (simulating the FIFO bug scenario)
    const restoredNotes = [
      { id: '1', content: 'Old note 1', left: '100px', top: '100px' },
      { id: '5', content: 'Old note 5', left: '200px', top: '200px' },
      { id: 'A', content: 'Old note A', left: '300px', top: '300px' },
    ];

    // Simulate restoration process - use DataProvider for proper state sync
    restoredNotes.forEach((note) =>
      dataProvider.upsertNote(
        {
          id: note.id,
          content: note.content,
          pos: [parseFloat(note.left), parseFloat(note.top)],
        },
        { origin: 'system' },
      ),
    );

    // Wait for system save to complete
    await new Promise((resolve) => setTimeout(resolve, 350));

    NoteIdService.ensureUniqueIds(restoredNotes);

    // When: User creates new notes (this would trigger FIFO bug in old system)
    const newNote1Id = NoteIdService.generateNextId();
    const newNote2Id = NoteIdService.generateNextId();

    dataProvider.upsertNote({
      id: newNote1Id,
      content: 'New note 1',
      pos: [400, 400],
    });
    dataProvider.upsertNote({
      id: newNote2Id,
      content: 'New note 2',
      pos: [500, 500],
    });

    // Wait for debounced autosave to complete (300ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Then: No ID collisions should occur
    const finalState = persistenceService.getState();
    expect(finalState.notes).toHaveLength(5); // 3 restored + 2 new

    // All original notes should still exist
    expect(finalState.notes.find((n) => n.id === '1')).toBeDefined();
    expect(finalState.notes.find((n) => n.id === '5')).toBeDefined();
    expect(finalState.notes.find((n) => n.id === 'A')).toBeDefined();

    // New notes should have unique IDs that don't collide
    expect(finalState.notes.find((n) => n.id === newNote1Id)).toBeDefined();
    expect(finalState.notes.find((n) => n.id === newNote2Id)).toBeDefined();

    // Verify new IDs don't overwrite existing ones
    expect(newNote1Id).not.toBe('1');
    expect(newNote1Id).not.toBe('5');
    expect(newNote1Id).not.toBe('A');
    expect(newNote2Id).not.toBe('1');
    expect(newNote2Id).not.toBe('5');
    expect(newNote2Id).not.toBe('A');
  });
});
