// tests/unit/services/noteService.test.js

describe('NoteService', () => {
  let NoteService;
  let mockCreateNote;
  let mockAddNoteEventListeners;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockCreateNote = jest.fn();
    mockAddNoteEventListeners = jest.fn();

    // Mock dependencies before importing
    jest.doMock('../../../src/js/factories/noteFactory.js', () => ({
      createNote: mockCreateNote,
    }));

    jest.doMock('../../../src/js/features/note/noteEvents.js', () => ({
      addNoteEventListeners: mockAddNoteEventListeners,
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/noteService.js');
    NoteService = module.NoteService;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any created DOM elements
    document.querySelectorAll('.note').forEach((note) => note.remove());
  });

  describe('createNoteFromData', () => {
    let mockNote;
    let mockNoteContent;
    let mockCanvas;

    beforeEach(() => {
      mockNoteContent = document.createElement('div');
      mockNoteContent.className = 'note-content';

      mockNote = document.createElement('div');
      mockNote.appendChild(mockNoteContent);
      mockNote.querySelector = jest.fn().mockReturnValue(mockNoteContent);

      mockCanvas = document.createElement('div');

      mockCreateNote.mockReturnValue(mockNote);
    });

    it('should create note with legacy data format (p array)', () => {
      const noteData = {
        i: 'test-id',
        c: 'test content',
        p: [100, 200],
      };

      const result = NoteService.createNoteFromData(noteData, mockCanvas);

      expect(mockCreateNote).toHaveBeenCalledWith(
        100,
        200,
        mockCanvas,
        mockAddNoteEventListeners,
      );
      expect(result.id).toBe('test-id');
      expect(mockNoteContent.textContent).toBe('test content');
    });

    it('should create note with standard data format (left/top)', () => {
      const noteData = {
        id: 'standard-id',
        content: 'standard content',
        left: '150',
        top: '250',
      };

      const result = NoteService.createNoteFromData(noteData, mockCanvas);

      expect(mockCreateNote).toHaveBeenCalledWith(
        150,
        250,
        mockCanvas,
        mockAddNoteEventListeners,
      );
      expect(result.id).toBe('standard-id');
      expect(mockNoteContent.textContent).toBe('standard content');
    });

    it('should handle mixed data formats (prefer non-array format)', () => {
      const noteData = {
        id: 'mixed-id',
        i: 'legacy-id',
        content: 'mixed content',
        c: 'legacy content',
        left: '300',
        top: '400',
        p: [100, 200],
      };

      const result = NoteService.createNoteFromData(noteData, mockCanvas);

      expect(mockCreateNote).toHaveBeenCalledWith(
        300,
        400,
        mockCanvas,
        mockAddNoteEventListeners,
      );
      expect(result.id).toBe('mixed-id');
      expect(mockNoteContent.textContent).toBe('mixed content');
    });

    it('should handle missing position data gracefully', () => {
      const noteData = {
        id: 'no-position-id',
        content: 'content without position',
        left: undefined,
        top: undefined,
        p: [0, 0], // Provide fallback position
      };

      const result = NoteService.createNoteFromData(noteData, mockCanvas);

      expect(mockCreateNote).toHaveBeenCalledWith(
        0,
        0,
        mockCanvas,
        mockAddNoteEventListeners,
      );
      expect(result.id).toBe('no-position-id');
    });

    it('should handle missing content gracefully', () => {
      const noteData = {
        id: 'no-content-id',
        left: '100',
        top: '200',
      };

      NoteService.createNoteFromData(noteData, mockCanvas);

      expect(mockNoteContent.textContent).toBe('');
    });

    it('should pass event listener callback to createNote', () => {
      const noteData = {
        id: 'callback-test',
        left: '0',
        top: '0',
      };

      NoteService.createNoteFromData(noteData, mockCanvas);

      expect(mockCreateNote).toHaveBeenCalledWith(
        0,
        0,
        mockCanvas,
        mockAddNoteEventListeners,
      );
    });
  });

  describe('clearAllNotes', () => {
    beforeEach(() => {
      // Create some test notes in the DOM
      const note1 = document.createElement('div');
      note1.className = 'note';
      note1.id = 'note1';
      document.body.appendChild(note1);

      const note2 = document.createElement('div');
      note2.className = 'note';
      note2.id = 'note2';
      document.body.appendChild(note2);

      const notNote = document.createElement('div');
      notNote.className = 'other-element';
      notNote.id = 'not-note';
      document.body.appendChild(notNote);
    });

    afterEach(() => {
      // Clean up any remaining elements
      document
        .querySelectorAll('.note, .other-element')
        .forEach((el) => el.remove());
    });

    it('should remove all elements with .note class', () => {
      // Verify notes exist before clearing
      expect(document.querySelectorAll('.note')).toHaveLength(2);
      expect(document.querySelectorAll('.other-element')).toHaveLength(1);

      NoteService.clearAllNotes();

      // Verify only notes were removed
      expect(document.querySelectorAll('.note')).toHaveLength(0);
      expect(document.querySelectorAll('.other-element')).toHaveLength(1);
    });

    it('should handle empty DOM gracefully', () => {
      // Clear existing notes first
      document.querySelectorAll('.note').forEach((note) => note.remove());

      expect(() => {
        NoteService.clearAllNotes();
      }).not.toThrow();

      expect(document.querySelectorAll('.note')).toHaveLength(0);
    });

    it('should remove notes with various attributes', () => {
      const complexNote = document.createElement('div');
      complexNote.className = 'note selected';
      complexNote.style.left = '100px';
      complexNote.style.top = '200px';
      complexNote.innerHTML = '<div class="note-content">Complex note</div>';
      document.body.appendChild(complexNote);

      expect(document.querySelectorAll('.note')).toHaveLength(3);

      NoteService.clearAllNotes();

      expect(document.querySelectorAll('.note')).toHaveLength(0);
    });
  });
});
