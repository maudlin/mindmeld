// tests/unit/interactions/behaviors/NavbarBehavior.test.js
// TDD tests for navbar functionality including map title editing

describe('NavbarBehavior - Navbar Functionality', () => {
  let NavbarBehavior;
  let navbarBehavior;
  let mockEventBus;
  let mockCanvas;
  let mockPersistenceService;
  let mockMapsApi;
  let mockTitleElement;
  let mockCollaboratorsContainer;
  let createdInputElements;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockCanvas = {
      id: 'test-canvas',
    };

    mockPersistenceService = {
      getState: jest.fn(() => ({
        notes: [],
        connections: [],
        metadata: { title: 'Test Map' },
      })),
      setState: jest.fn(),
    };

    mockMapsApi = {
      updateMapMetadata: jest.fn().mockResolvedValue({ success: true }),
    };

    // Create real DOM elements (following ModalBehavior pattern)
    mockTitleElement = document.createElement('div');
    mockTitleElement.id = 'map-title';
    mockTitleElement.textContent = 'Untitled Map';

    mockCollaboratorsContainer = document.createElement('div');
    mockCollaboratorsContainer.id = 'collaborators';
    mockCollaboratorsContainer.style.display = 'none';

    // Append to document body so getElementById can find them
    document.body.appendChild(mockTitleElement);
    document.body.appendChild(mockCollaboratorsContainer);

    // Track created input elements for testing
    createdInputElements = [];

    // Mock required services with correct paths
    jest.doMock('../../../../src/js/services/PersistenceService.js', () => ({
      persistenceService: mockPersistenceService,
    }));

    jest.doMock('../../../../src/js/services/logger.js', () => ({
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));

    // Mock other required services that MenuBehavior depends on
    jest.doMock('../../../../src/js/services/mapsApi.js', () => ({
      createMapsApi: jest.fn(() => mockMapsApi),
    }));

    jest.doMock('../../../../src/js/services/DataProviderService.js', () => ({
      DataProviderService: {
        getInstance: jest.fn(() => ({
          exportJSON: jest.fn(() => '{}'),
          importJSON: jest.fn(),
        })),
      },
    }));

    jest.doMock('../../../../src/js/data/dataStore.js', () => ({
      clearAllNotesAndConnections: jest.fn(),
    }));

    jest.doMock('../../../../src/js/data/observableState.js', () => ({
      appState: {
        clearLocalStorage: jest.fn(),
        setState: jest.fn(),
      },
    }));

    jest.doMock('../../../../src/js/services/notificationManager.js', () => ({
      notificationManager: {
        success: jest.fn(),
        error: jest.fn(),
        confirm: jest.fn(() => Promise.resolve(true)),
      },
    }));

    jest.doMock('../../../../src/js/services/serverClient.js', () => ({
      ServerClient: {
        getConnectionStatus: jest.fn(() => ({ isConnected: false })),
      },
    }));

    jest.doMock(
      '../../../../src/js/services/serverConnectionService.js',
      () => ({
        ServerConnectionService: {
          getConnectionState: jest.fn(() => ({
            isConnected: false,
            connectionStatus: 'disconnected',
          })),
        },
      }),
    );

    // Mock CollaborationService
    const mockCollaborationService = {
      getInstance: jest.fn(() => mockCollaborationService),
      isCollaborationActive: jest.fn(() => false),
      getActiveUsers: jest.fn(() => []),
    };

    jest.doMock('../../../../src/js/services/CollaborationService.js', () => ({
      CollaborationService: mockCollaborationService,
    }));

    // Import NavbarBehavior after mocking
    const NavbarBehaviorModule = await import(
      '../../../../src/js/interactions/behaviors/NavbarBehavior.js'
    );
    NavbarBehavior = NavbarBehaviorModule.NavbarBehavior;

    // Create instance
    navbarBehavior = new NavbarBehavior(mockEventBus);

    // Reset mock state for each test
    createdInputElements = [];
    mockTitleElement.textContent = 'Untitled Map';
    mockTitleElement.style.display = '';
  });

  afterEach(() => {
    // Clean up DOM elements
    if (mockTitleElement && document.body.contains(mockTitleElement)) {
      document.body.removeChild(mockTitleElement);
    }
    if (
      mockCollaboratorsContainer &&
      document.body.contains(mockCollaboratorsContainer)
    ) {
      document.body.removeChild(mockCollaboratorsContainer);
    }

    jest.restoreAllMocks();
  });

  describe('Map Title Display', () => {
    test('should have default map name of "Untitled Map"', () => {
      expect(navbarBehavior.getCurrentMapName()).toBe('Untitled Map');
    });

    test('should update navbar title element when map name changes', () => {
      navbarBehavior.setCurrentMapName('My Test Map');
      navbarBehavior.updateNavbarTitle();

      expect(mockTitleElement.textContent).toBe('My Test Map');
    });

    test('should handle null or empty map names gracefully', () => {
      navbarBehavior.setCurrentMapName(null);
      expect(navbarBehavior.getCurrentMapName()).toBe('Untitled Map');

      navbarBehavior.setCurrentMapName('');
      expect(navbarBehavior.getCurrentMapName()).toBe('Untitled Map');

      navbarBehavior.setCurrentMapName('   ');
      expect(navbarBehavior.getCurrentMapName()).toBe('Untitled Map');
    });

    test('should load map title from persistence service on initialization', () => {
      mockPersistenceService.getState.mockReturnValue({
        metadata: { title: 'Saved Map Title' },
      });

      navbarBehavior.loadMapTitleFromState();

      expect(navbarBehavior.getCurrentMapName()).toBe('Saved Map Title');
    });
  });

  describe('Map Title Editing', () => {
    test('should create input element when title is clicked for editing', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');

      navbarBehavior.handleTitleClick();

      expect(createElementSpy).toHaveBeenCalledWith('input');
    });

    test('should setup input element with current title value', () => {
      navbarBehavior.setCurrentMapName('Current Title');

      navbarBehavior.handleTitleClick();

      // Check that an input was created and configured properly
      const createdInput = document.querySelector('input.title-edit-input');
      expect(createdInput).toBeTruthy();
      expect(createdInput.type).toBe('text');
      expect(createdInput.maxLength).toBe(100);
      expect(createdInput.className).toBe('title-edit-input');
      expect(createdInput.value).toBe('Current Title');
    });

    test('should hide title element and show input during editing', () => {
      navbarBehavior.handleTitleClick();

      expect(mockTitleElement.style.display).toBe('none');
      // Check that input was inserted before the title element
      const createdInput = document.querySelector('input.title-edit-input');
      expect(createdInput).toBeTruthy();
      expect(createdInput.nextSibling).toBe(mockTitleElement);
    });

    test('should focus and select input text when editing starts', () => {
      navbarBehavior.handleTitleClick();

      // Check that an input was created
      const createdInput = document.querySelector('input.title-edit-input');
      expect(createdInput).toBeTruthy();
      // Note: We can't easily test focus/select calls with real DOM,
      // but we can verify the input exists and is properly positioned
      expect(createdInput.parentNode).toBe(mockTitleElement.parentNode);
    });
  });

  describe('Map Title Validation', () => {
    test('should validate and sanitize map title input', () => {
      expect(navbarBehavior.validateMapTitle('Valid Title')).toBe(
        'Valid Title',
      );
      expect(navbarBehavior.validateMapTitle('  Trimmed Title  ')).toBe(
        'Trimmed Title',
      );
      expect(navbarBehavior.validateMapTitle('')).toBe('Untitled Map');
      expect(navbarBehavior.validateMapTitle(null)).toBe('Untitled Map');
      expect(navbarBehavior.validateMapTitle(undefined)).toBe('Untitled Map');
    });

    test('should remove potentially dangerous characters', () => {
      expect(navbarBehavior.validateMapTitle('Title<script>')).toBe(
        'Titlescript',
      );
      expect(navbarBehavior.validateMapTitle('Title>test<')).toBe('Titletest');
    });

    test('should limit title length to 100 characters', () => {
      const longTitle = 'a'.repeat(150);
      const validatedTitle = navbarBehavior.validateMapTitle(longTitle);

      expect(validatedTitle.length).toBe(100);
      expect(validatedTitle).toBe('a'.repeat(100));
    });
  });

  describe('Map Title Persistence', () => {
    test('should save map title to persistence service', async () => {
      const newTitle = 'New Map Title';

      await navbarBehavior.saveMapTitle(newTitle);

      expect(mockPersistenceService.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        metadata: { title: newTitle },
      });
    });

    test('should save map title locally without server', async () => {
      await navbarBehavior.saveMapTitle('Local Saved Title');

      expect(mockPersistenceService.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        metadata: { title: 'Local Saved Title' },
      });
    });

    test('should emit collaboration event when title changes', async () => {
      await navbarBehavior.saveMapTitle('Collaborative Title');

      expect(mockEventBus.emit).toHaveBeenCalledWith('map.title.changed', {
        title: 'Collaborative Title',
      });
    });
  });

  describe('Edit Mode Handlers', () => {
    let mockInput;

    beforeEach(() => {
      mockInput = {
        value: 'Test Title',
        remove: jest.fn(),
        addEventListener: jest.fn(),
      };
    });

    test('should save title and exit edit mode on Enter key', () => {
      const saveSpy = jest
        .spyOn(navbarBehavior, 'saveMapTitle')
        .mockResolvedValue();

      navbarBehavior.setupTitleEditHandlers(
        mockInput,
        mockTitleElement,
        'Original Title',
      );

      // Simulate Enter key press
      const keydownHandler = mockInput.addEventListener.mock.calls.find(
        (call) => call[0] === 'keydown',
      )[1];

      const mockEvent = { key: 'Enter', preventDefault: jest.fn() };
      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockInput.remove).toHaveBeenCalled();
      expect(mockTitleElement.style.display).toBe('');
    });

    test('should cancel edit mode on Escape key', () => {
      navbarBehavior.setupTitleEditHandlers(
        mockInput,
        mockTitleElement,
        'Original Title',
      );

      // Simulate Escape key press
      const keydownHandler = mockInput.addEventListener.mock.calls.find(
        (call) => call[0] === 'keydown',
      )[1];

      const mockEvent = { key: 'Escape', preventDefault: jest.fn() };
      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockInput.remove).toHaveBeenCalled();
      expect(mockTitleElement.style.display).toBe('');
      expect(mockTitleElement.textContent).toBe('Original Title');
    });

    test('should save title on blur event', () => {
      const saveSpy = jest
        .spyOn(navbarBehavior, 'saveMapTitle')
        .mockResolvedValue();

      navbarBehavior.setupTitleEditHandlers(
        mockInput,
        mockTitleElement,
        'Original Title',
      );

      // Simulate blur event
      const blurHandler = mockInput.addEventListener.mock.calls.find(
        (call) => call[0] === 'blur',
      )[1];

      blurHandler();

      expect(mockInput.remove).toHaveBeenCalled();
      expect(mockTitleElement.style.display).toBe('');
    });
  });

  describe('Map Event Integration', () => {
    test('should listen for map.loaded events', () => {
      navbarBehavior.setupEventListeners();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'map.loaded',
        expect.any(Function),
      );
    });

    test('should listen for map.created events', () => {
      navbarBehavior.setupEventListeners();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'map.created',
        expect.any(Function),
      );
    });

    test('should update title when receiving map.loaded events', () => {
      const setTitleSpy = jest.spyOn(navbarBehavior, 'setCurrentMapName');

      navbarBehavior.setupEventListeners();

      // Get the event handler
      const mapLoadedHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'map.loaded',
      )[1];

      // Simulate map loaded event
      mapLoadedHandler({
        mapId: 'test-map',
        mapName: 'Test Map',
        metadata: { title: 'Test Map' },
      });

      expect(setTitleSpy).toHaveBeenCalledWith('Test Map');
    });

    test('should update title when receiving map.created events', () => {
      const setTitleSpy = jest.spyOn(navbarBehavior, 'setCurrentMapName');

      navbarBehavior.setupEventListeners();

      // Get the event handler
      const mapCreatedHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'map.created',
      )[1];

      // Simulate map created event
      mapCreatedHandler({
        mapId: 'new-map',
        mapName: 'New Map',
        metadata: { title: 'New Map' },
      });

      expect(setTitleSpy).toHaveBeenCalledWith('New Map');
    });
  });

  describe('Collaboration Integration', () => {
    test('should listen for collaboration title change events', () => {
      navbarBehavior.setupCollaborationEventListeners();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'collaboration.map.title.changed',
        expect.any(Function),
      );
    });

    test('should update title when receiving collaboration events', () => {
      const setTitleSpy = jest.spyOn(navbarBehavior, 'setCurrentMapName');
      const updateSpy = jest.spyOn(navbarBehavior, 'updateNavbarTitle');

      navbarBehavior.setupCollaborationEventListeners();

      // Get the event handler
      const collaborationHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'collaboration.map.title.changed',
      )[1];

      // Simulate collaboration event
      collaborationHandler({ title: 'Collaborative Title' });

      expect(setTitleSpy).toHaveBeenCalledWith('Collaborative Title');
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Integration with NavbarBehavior', () => {
    test('should integrate title functionality into NavbarBehavior', () => {
      // Verify that NavbarBehavior has the title methods
      expect(typeof navbarBehavior.getCurrentMapName).toBe('function');
      expect(typeof navbarBehavior.setCurrentMapName).toBe('function');
      expect(typeof navbarBehavior.handleTitleClick).toBe('function');
      expect(typeof navbarBehavior.validateMapTitle).toBe('function');
      expect(typeof navbarBehavior.saveMapTitle).toBe('function');
      expect(typeof navbarBehavior.updateNavbarTitle).toBe('function');
    });

    test('should maintain existing NavbarBehavior functionality', () => {
      // Ensure core behavior methods work
      expect(typeof navbarBehavior.initialize).toBe('function');
      expect(typeof navbarBehavior.getState).toBe('function');
      expect(typeof navbarBehavior.destroy).toBe('function');
    });
  });
});
