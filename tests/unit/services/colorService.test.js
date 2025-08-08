// tests/unit/services/colorService.simple.test.js

describe('ColorService', () => {
  let ColorService;
  let mockEventBus;
  let mockAppState;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
    };

    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/colorService.js');
    ColorService = module.ColorService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('VALID_COLORS', () => {
    it('should contain expected color schemes', () => {
      expect(ColorService.VALID_COLORS).toEqual([
        'yellow',
        'pink',
        'green',
        'blue',
      ]);
    });
  });

  describe('isValidColor', () => {
    it('should return true for valid colors', () => {
      expect(ColorService.isValidColor('yellow')).toBe(true);
      expect(ColorService.isValidColor('pink')).toBe(true);
      expect(ColorService.isValidColor('green')).toBe(true);
      expect(ColorService.isValidColor('blue')).toBe(true);
    });

    it('should return false for invalid colors', () => {
      expect(ColorService.isValidColor('red')).toBe(false);
      expect(ColorService.isValidColor('purple')).toBe(false);
      expect(ColorService.isValidColor('')).toBe(false);
      expect(ColorService.isValidColor(null)).toBe(false);
      expect(ColorService.isValidColor(undefined)).toBe(false);
    });
  });

  describe('setCurrentColor', () => {
    beforeEach(() => {
      mockAppState.getState.mockReturnValue({
        colorState: {
          currentColor: 'yellow',
          notes: {},
        },
      });
    });

    it('should set valid color and emit event', () => {
      const result = ColorService.setCurrentColor('pink');

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        colorState: {
          currentColor: 'pink',
          notes: {},
        },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('color.changed', {
        color: 'pink',
      });
    });

    it('should reject invalid colors', () => {
      const result = ColorService.setCurrentColor('invalidColor');

      expect(result).toBe(false);
      expect(mockAppState.setState).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentColor', () => {
    it('should return current color from state', () => {
      mockAppState.getState.mockReturnValue({
        colorState: { currentColor: 'blue' },
      });

      const result = ColorService.getCurrentColor();
      expect(result).toBe('blue');
    });
  });

  describe('setNoteColor', () => {
    beforeEach(() => {
      mockAppState.getState.mockReturnValue({
        colorState: {
          currentColor: 'yellow',
          notes: {},
        },
      });
    });

    it('should set color for single note', () => {
      const result = ColorService.setNoteColor('note1', 'green');

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        colorState: {
          currentColor: 'yellow',
          notes: {
            note1: { colorScheme: 'green' },
          },
        },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('note.color.changed', {
        noteIds: ['note1'],
        color: 'green',
      });
    });

    it('should set color for multiple notes', () => {
      const noteIds = ['note1', 'note2'];
      const result = ColorService.setNoteColor(noteIds, 'pink');

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        colorState: {
          currentColor: 'yellow',
          notes: {
            note1: { colorScheme: 'pink' },
            note2: { colorScheme: 'pink' },
          },
        },
      });
    });

    it('should reject invalid colors', () => {
      const result = ColorService.setNoteColor('note1', 'invalidColor');

      expect(result).toBe(false);
      expect(mockAppState.setState).not.toHaveBeenCalled();
    });
  });

  describe('getNoteColor', () => {
    it('should return specific note color if set', () => {
      mockAppState.getState.mockReturnValue({
        colorState: {
          currentColor: 'yellow',
          notes: {
            note1: { colorScheme: 'pink' },
          },
        },
      });

      const result = ColorService.getNoteColor('note1');
      expect(result).toBe('pink');
    });

    it('should return current color if note has no specific color', () => {
      mockAppState.getState.mockReturnValue({
        colorState: {
          currentColor: 'blue',
          notes: {},
        },
      });

      const result = ColorService.getNoteColor('unknownNote');
      expect(result).toBe('blue');
    });
  });

  describe('getAllNoteColors', () => {
    it('should return all note colors from state', () => {
      const noteColors = {
        note1: { colorScheme: 'pink' },
        note2: { colorScheme: 'blue' },
      };

      mockAppState.getState.mockReturnValue({
        colorState: { notes: noteColors },
      });

      const result = ColorService.getAllNoteColors();
      expect(result).toEqual(noteColors);
    });
  });

  describe('resetColorState', () => {
    it('should reset to default state and emit event', () => {
      ColorService.resetColorState();

      expect(mockAppState.setState).toHaveBeenCalledWith({
        colorState: {
          currentColor: 'yellow',
          notes: {},
        },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('color.state.reset');
    });
  });
});
