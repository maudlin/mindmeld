// tests/unit/factories/noteFactory.test.js

describe('noteFactory', () => {
  let createNote, createNoteAtPosition;
  let mockEventBus;
  let mockUtils;
  let mockConfig;
  let mockConstants;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockEventBus = {
      emit: jest.fn(),
    };

    mockUtils = {
      toBase62: jest.fn().mockImplementation((num) => `base62_${num}`),
      calculateOffsetPosition: jest
        .fn()
        .mockReturnValue({ left: 150, top: 100 }),
    };

    mockConfig = {
      noteSize: {
        width: 200,
        height: 100,
        padding: 10,
      },
    };

    mockConstants = {
      NOTE_CONTENT_LIMIT: 500,
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/utils/utils.js', () => mockUtils);

    jest.doMock('../../../src/js/core/config.js', () => mockConfig);

    jest.doMock('../../../src/js/core/constants.js', () => mockConstants);

    // Mock window methods that might be used
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: jest.fn().mockReturnValue({
        removeAllRanges: jest.fn(),
        addRange: jest.fn(),
      }),
    });

    global.Range = jest.fn().mockImplementation(() => ({
      setStart: jest.fn(),
      collapse: jest.fn(),
    }));

    // Import the module to test
    const module = await import('../../../src/js/factories/noteFactory.js');
    createNote = module.createNote;
    createNoteAtPosition = module.createNoteAtPosition;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    document.querySelectorAll('.note').forEach((note) => note.remove());
  });

  describe('createNote', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => {
      document.body.removeChild(mockCanvas);
    });

    it('should create a note with correct structure', () => {
      const note = createNote(100, 200, mockCanvas);

      expect(note).toBeInstanceOf(HTMLDivElement);
      expect(note.className).toBe('note');
      expect(note.style.left).toBe('100px');
      expect(note.style.top).toBe('200px');
      expect(note.style.width).toBe('200px');
      expect(note.style.padding).toBe('10px');
    });

    it('should create note content div with correct properties', () => {
      const note = createNote(100, 200, mockCanvas);
      const noteContent = note.querySelector('.note-content');

      expect(noteContent).toBeInstanceOf(HTMLDivElement);
      expect(noteContent.className).toBe('note-content');
      expect(noteContent.contentEditable).toBe('true');
    });

    it('should generate unique note ID using base62', () => {
      mockUtils.toBase62.mockReturnValueOnce('unique_id_1');

      const note = createNote(100, 200, mockCanvas);

      expect(note.id).toBe('unique_id_1');
      expect(mockUtils.toBase62).toHaveBeenCalledWith(1);
    });

    it('should increment note ID counter for multiple notes', () => {
      mockUtils.toBase62
        .mockReturnValueOnce('id_1')
        .mockReturnValueOnce('id_2')
        .mockReturnValueOnce('id_3');

      const note1 = createNote(100, 200, mockCanvas);
      const note2 = createNote(150, 250, mockCanvas);
      const note3 = createNote(200, 300, mockCanvas);

      expect(mockUtils.toBase62).toHaveBeenNthCalledWith(1, 1);
      expect(mockUtils.toBase62).toHaveBeenNthCalledWith(2, 2);
      expect(mockUtils.toBase62).toHaveBeenNthCalledWith(3, 3);
      expect(note1.id).toBe('id_1');
      expect(note2.id).toBe('id_2');
      expect(note3.id).toBe('id_3');
    });

    it('should create ghost connectors', () => {
      const note = createNote(100, 200, mockCanvas);
      const connectors = note.querySelectorAll('.ghost-connector');

      expect(connectors).toHaveLength(4);

      const positions = ['top', 'bottom', 'left', 'right'];
      positions.forEach((position) => {
        const connector = note.querySelector(`.ghost-connector.${position}`);
        expect(connector).toBeTruthy();
        expect(connector.className).toContain('ghost-connector');
        expect(connector.className).toContain(position);
      });
    });

    it('should emit note.created event', () => {
      mockUtils.toBase62.mockReturnValueOnce('test_id');

      createNote(100, 200, mockCanvas);

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.created', {
        id: 'test_id',
        content: '',
        left: '100px',
        top: '200px',
      });
    });

    it('should append note to canvas', () => {
      const note = createNote(100, 200, mockCanvas);

      expect(mockCanvas.contains(note)).toBe(true);
      expect(mockCanvas.children).toContain(note);
    });

    it('should call addEventListeners callback if provided', () => {
      const mockAddEventListeners = jest.fn();
      const note = createNote(100, 200, mockCanvas, mockAddEventListeners);

      expect(mockAddEventListeners).toHaveBeenCalledWith(note, mockCanvas);
    });

    it('should not fail when addEventListeners callback is null', () => {
      expect(() => {
        createNote(100, 200, mockCanvas, null);
      }).not.toThrow();
    });

    describe('content input handling', () => {
      it('should limit content to NOTE_CONTENT_LIMIT', () => {
        const note = createNote(100, 200, mockCanvas);
        const noteContent = note.querySelector('.note-content');

        // Create a long text that exceeds the limit
        const longText = 'x'.repeat(600); // Exceeds limit of 500
        noteContent.innerText = longText;

        // Simulate input event
        const inputEvent = new Event('input');
        noteContent.dispatchEvent(inputEvent);

        expect(noteContent.innerText).toHaveLength(500);
      });

      it('should emit note.updated and state.save events on content change', () => {
        mockUtils.toBase62.mockReturnValueOnce('content_test_id');
        const note = createNote(100, 200, mockCanvas);
        const noteContent = note.querySelector('.note-content');

        noteContent.innerHTML = 'New content';
        const inputEvent = new Event('input');
        noteContent.dispatchEvent(inputEvent);

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.updated', {
          id: 'content_test_id',
          content: 'New content',
        });
        expect(mockEventBus.emit).toHaveBeenCalledWith('state.save');
      });

      it('should handle content that is exactly at the limit', () => {
        const note = createNote(100, 200, mockCanvas);
        const noteContent = note.querySelector('.note-content');

        const exactLimitText = 'x'.repeat(500);
        noteContent.innerText = exactLimitText;

        const inputEvent = new Event('input');
        noteContent.dispatchEvent(inputEvent);

        expect(noteContent.innerText).toHaveLength(500);
        expect(noteContent.innerText).toBe(exactLimitText);
      });
    });
  });

  describe('createNoteAtPosition', () => {
    let mockCanvas, mockEvent;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);

      mockEvent = {
        clientX: 300,
        clientY: 400,
      };
    });

    afterEach(() => {
      document.body.removeChild(mockCanvas);
    });

    it('should calculate position using calculateOffsetPosition', () => {
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 275,
        top: 350,
      });

      createNoteAtPosition(mockCanvas, mockEvent);

      expect(mockUtils.calculateOffsetPosition).toHaveBeenCalledWith(
        mockCanvas,
        mockEvent,
      );
    });

    it('should offset position to center the note', () => {
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 300,
        top: 200,
      });

      const note = createNoteAtPosition(mockCanvas, mockEvent);

      // Should be offset by half width (200/2 = 100) and 20px for top
      expect(note.style.left).toBe('200px'); // 300 - 100
      expect(note.style.top).toBe('180px'); // 200 - 20
    });

    it('should pass addEventListeners callback to createNote', () => {
      const mockAddEventListeners = jest.fn();
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 150,
        top: 100,
      });

      createNoteAtPosition(mockCanvas, mockEvent, mockAddEventListeners);

      expect(mockAddEventListeners).toHaveBeenCalled();
    });

    it('should handle null addEventListeners callback', () => {
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 150,
        top: 100,
      });

      expect(() => {
        createNoteAtPosition(mockCanvas, mockEvent, null);
      }).not.toThrow();
    });

    it('should create note in canvas', () => {
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 150,
        top: 100,
      });

      const note = createNoteAtPosition(mockCanvas, mockEvent);

      expect(mockCanvas.contains(note)).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => {
      document.body.removeChild(mockCanvas);
    });

    it('should handle zero coordinates', () => {
      const note = createNote(0, 0, mockCanvas);

      expect(note.style.left).toBe('0px');
      expect(note.style.top).toBe('0px');
    });

    it('should handle negative coordinates', () => {
      const note = createNote(-50, -100, mockCanvas);

      expect(note.style.left).toBe('-50px');
      expect(note.style.top).toBe('-100px');
    });

    it('should handle very large coordinates', () => {
      const note = createNote(9999, 8888, mockCanvas);

      expect(note.style.left).toBe('9999px');
      expect(note.style.top).toBe('8888px');
    });

    it('should handle floating point coordinates', () => {
      const note = createNote(123.456, 789.123, mockCanvas);

      expect(note.style.left).toBe('123.456px');
      expect(note.style.top).toBe('789.123px');
    });
  });
});
