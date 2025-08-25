// tests/unit/factories/noteFactory.test.js
// Consolidated tests for note factory functionality

describe('noteFactory', () => {
  let createNote,
    createNoteAtPosition,
    mockEventBus,
    mockUtils,
    mockConfig,
    mockConstants;

  const setupMocks = () => {
    mockEventBus = { emit: jest.fn() };
    mockUtils = {
      toBase62: jest.fn().mockImplementation((num) => `base62_${num}`),
      calculateOffsetPosition: jest
        .fn()
        .mockReturnValue({ left: 150, top: 100 }),
    };
    mockConfig = { noteSize: { width: 200, height: 100, padding: 10 } };
    mockConstants = { NOTE_CONTENT_LIMIT: 500 };
  };

  beforeEach(async () => {
    jest.resetModules();
    setupMocks();

    // Mock dependencies
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));
    jest.doMock('../../../src/js/utils/utils.js', () => mockUtils);
    jest.doMock('../../../src/js/core/config.js', () => mockConfig);
    jest.doMock('../../../src/js/core/constants.js', () => mockConstants);

    // Mock window methods
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: jest
        .fn()
        .mockReturnValue({ removeAllRanges: jest.fn(), addRange: jest.fn() }),
    });
    global.Range = jest
      .fn()
      .mockImplementation(() => ({ setStart: jest.fn(), collapse: jest.fn() }));

    // JSDOM innerText polyfill
    if (
      !Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'innerText')
    ) {
      Object.defineProperty(HTMLElement.prototype, 'innerText', {
        get() {
          return this.textContent;
        },
        set(value) {
          this.textContent = value;
        },
        configurable: true,
      });
    }

    const module = await import('../../../src/js/factories/noteFactory.js');
    createNote = module.createNote;
    createNoteAtPosition = module.createNoteAtPosition;
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.querySelectorAll('.note').forEach((note) => note.remove());
  });

  describe('createNote', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => mockCanvas?.parentNode?.removeChild(mockCanvas));

    it('creates note with correct structure and properties', () => {
      mockUtils.toBase62.mockReturnValueOnce('unique_id_1');
      const note = createNote(100, 200, mockCanvas);

      // Basic structure
      expect(note).toBeInstanceOf(HTMLDivElement);
      expect(note.className).toBe('note');
      expect(note.id).toBe('unique_id_1');
      expect(note.style.left).toBe('100px');
      expect(note.style.top).toBe('200px');
      expect(note.style.width).toBe('200px');
      expect(note.style.padding).toBe('10px');

      // Note content
      const noteContent = note.querySelector('.note-content');
      expect(noteContent).toBeInstanceOf(HTMLDivElement);
      expect(noteContent.className).toBe('note-content view-mode');
      expect(noteContent.contentEditable).toBe(false); // Starts in view mode

      // Ghost connectors
      const connectors = note.querySelectorAll('.ghost-connector');
      expect(connectors).toHaveLength(4);
      ['top', 'bottom', 'left', 'right'].forEach((position) => {
        const connector = note.querySelector(`.ghost-connector.${position}`);
        expect(connector).toBeTruthy();
        expect(connector.className).toContain(position);
      });

      // DOM integration and events
      expect(mockCanvas.contains(note)).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('note.created', {
        id: 'unique_id_1',
        content: '',
        left: '100px',
        top: '200px',
      });
      expect(mockUtils.toBase62).toHaveBeenCalledWith(1);
    });

    it('increments ID counter for multiple notes', () => {
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
      expect([note1.id, note2.id, note3.id]).toEqual(['id_1', 'id_2', 'id_3']);
    });

    it('handles event listeners callback correctly', () => {
      const mockAddEventListeners = jest.fn();

      // With callback
      const note1 = createNote(100, 200, mockCanvas, mockAddEventListeners);
      expect(mockAddEventListeners).toHaveBeenCalledWith(note1, mockCanvas);

      // Without callback (null)
      expect(() => createNote(100, 200, mockCanvas, null)).not.toThrow();
    });

    describe('Content Input Handling', () => {
      it('enforces content limits and emits events correctly', () => {
        mockUtils.toBase62.mockReturnValueOnce('content_test_id');
        const note = createNote(100, 200, mockCanvas);
        const noteContent = note.querySelector('.note-content');
        mockEventBus.emit.mockClear(); // Clear creation events

        // Test content limit enforcement
        const longText = 'x'.repeat(600); // Exceeds limit
        noteContent.innerText = longText;
        noteContent.dispatchEvent(new Event('input'));
        expect(noteContent.innerText).toHaveLength(500);

        // Test exact limit content
        const exactLimitText = 'x'.repeat(500);
        noteContent.innerText = exactLimitText;
        noteContent.dispatchEvent(new Event('input'));
        expect(noteContent.innerText).toBe(exactLimitText);

        // Test that input events no longer trigger immediate saves (prevents corruption)
        noteContent.innerHTML = 'New content';
        noteContent.dispatchEvent(new Event('input'));
        // Should NOT emit note.updated on input to prevent corruption feedback loops
        expect(mockEventBus.emit).not.toHaveBeenCalledWith(
          'note.updated',
          expect.any(Object),
        );
        expect(mockEventBus.emit).not.toHaveBeenCalledWith('state.save');
      });
    });
  });

  describe('createNoteAtPosition', () => {
    let mockCanvas, mockEvent;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);
      mockEvent = { clientX: 300, clientY: 400 };
    });

    afterEach(() => mockCanvas?.parentNode?.removeChild(mockCanvas));

    it('calculates position correctly and creates centered note', () => {
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 300,
        top: 200,
      });

      const note = createNoteAtPosition(mockCanvas, mockEvent);

      expect(mockUtils.calculateOffsetPosition).toHaveBeenCalledWith(
        mockCanvas,
        mockEvent,
      );
      // Should be offset by half width (200/2 = 100) and 20px for top
      expect(note.style.left).toBe('200px'); // 300 - 100
      expect(note.style.top).toBe('180px'); // 200 - 20
      expect(mockCanvas.contains(note)).toBe(true);
    });

    it('handles event listeners callback correctly', () => {
      const mockAddEventListeners = jest.fn();
      mockUtils.calculateOffsetPosition.mockReturnValue({
        left: 150,
        top: 100,
      });

      // With callback
      createNoteAtPosition(mockCanvas, mockEvent, mockAddEventListeners);
      expect(mockAddEventListeners).toHaveBeenCalled();

      // Without callback (null)
      expect(() =>
        createNoteAtPosition(mockCanvas, mockEvent, null),
      ).not.toThrow();
    });
  });

  describe('Edge Cases and Coordinate Handling', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => mockCanvas?.parentNode?.removeChild(mockCanvas));

    const coordinateTestCases = [
      {
        x: 0,
        y: 0,
        expectedLeft: '0px',
        expectedTop: '0px',
        description: 'zero coordinates',
      },
      {
        x: -50,
        y: -100,
        expectedLeft: '-50px',
        expectedTop: '-100px',
        description: 'negative coordinates',
      },
      {
        x: 9999,
        y: 8888,
        expectedLeft: '9999px',
        expectedTop: '8888px',
        description: 'very large coordinates',
      },
      {
        x: 123.456,
        y: 789.123,
        expectedLeft: '123.456px',
        expectedTop: '789.123px',
        description: 'floating point coordinates',
      },
    ];

    it.each(coordinateTestCases)(
      'handles $description correctly',
      ({ x, y, expectedLeft, expectedTop }) => {
        const note = createNote(x, y, mockCanvas);
        expect(note.style.left).toBe(expectedLeft);
        expect(note.style.top).toBe(expectedTop);
      },
    );
  });
});
