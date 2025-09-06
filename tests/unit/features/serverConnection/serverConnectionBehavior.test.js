// tests/unit/features/serverConnection/serverConnectionBehavior.test.js

describe('ServerConnectionBehavior', () => {
  let ServerConnectionBehavior;
  let mockEventBus;
  let mockServerConnectionService;
  let mockDocument;
  let mockNotificationManager;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockServerConnectionService = {
      validateServerUri: jest.fn(),
      testConnection: jest.fn(),
      setServerUri: jest.fn(),
      getServerUri: jest.fn(),
      setConnectionStatus: jest.fn(),
      getConnectionState: jest.fn(),
      loadServerUriFromStorage: jest.fn(),
    };

    mockNotificationManager = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    // Mock DOM elements
    const mockModalElement = document.createElement('div');
    mockModalElement.id = 'server-connection-modal';
    mockModalElement.style.display = 'none';
    
    const mockForm = document.createElement('form');
    mockForm.id = 'server-connection-form';
    
    const mockInput = document.createElement('input');
    mockInput.id = 'server-uri-input';
    mockForm.appendChild(mockInput);
    
    const mockConnectBtn = document.createElement('button');
    mockConnectBtn.id = 'connect-server-btn';
    mockConnectBtn.textContent = 'Connect';
    mockForm.appendChild(mockConnectBtn);
    
    const mockTestBtn = document.createElement('button');
    mockTestBtn.id = 'test-connection-btn';
    mockTestBtn.textContent = 'Test Connection';
    mockForm.appendChild(mockTestBtn);
    
    const mockCloseBtn = document.createElement('button');
    mockCloseBtn.className = 'modal-close';
    mockForm.appendChild(mockCloseBtn);
    
    mockModalElement.appendChild(mockForm);
    document.body.appendChild(mockModalElement);

    mockDocument = {
      getElementById: jest.fn((id) => {
        switch (id) {
          case 'server-connection-modal':
            return mockModalElement;
          case 'server-connection-form':
            return mockForm;
          case 'server-uri-input':
            return mockInput;
          case 'connect-server-btn':
            return mockConnectBtn;
          case 'test-connection-btn':
            return mockTestBtn;
          default:
            return null;
        }
      }),
      querySelector: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Mock dependencies before importing
    jest.doMock('../../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: mockServerConnectionService,
    }));

    jest.doMock('../../../../src/js/services/notificationManager.js', () => ({
      notificationManager: mockNotificationManager,
    }));

    // Import the module to test
    const module = await import('../../../../src/js/features/serverConnection/serverConnectionBehavior.js');
    ServerConnectionBehavior = module.ServerConnectionBehavior;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    const modal = document.getElementById('server-connection-modal');
    if (modal) {
      modal.remove();
    }
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const behavior = new ServerConnectionBehavior(mockEventBus);

      expect(behavior.eventBus).toBe(mockEventBus);
      expect(behavior.isInitialized).toBe(false);
      expect(behavior.isModalOpen).toBe(false);
      expect(behavior.isConnecting).toBe(false);
      expect(behavior.name).toBe('ServerConnectionBehavior');
    });
  });

  describe('initialize', () => {
    it('should initialize behavior and setup event listeners', async () => {
      const behavior = new ServerConnectionBehavior(mockEventBus);

      await behavior.initialize();

      expect(behavior.isInitialized).toBe(true);
      expect(mockEventBus.on).toHaveBeenCalledWith('modal.serverConnection.open', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('modal.serverConnection.close', expect.any(Function));
    });

    it('should not reinitialize if already initialized', async () => {
      const behavior = new ServerConnectionBehavior(mockEventBus);
      behavior.isInitialized = true;

      await behavior.initialize();

      expect(mockEventBus.on).not.toHaveBeenCalled();
    });
  });

  describe('showModal', () => {
    let behavior;

    beforeEach(async () => {
      behavior = new ServerConnectionBehavior(mockEventBus);
      await behavior.initialize();
      mockServerConnectionService.getServerUri.mockReturnValue('https://existing-server.com');
    });

    it('should show modal and populate current server URI', () => {
      const data = { currentUrl: 'https://test-server.com' };
      
      behavior.showModal(data);

      const modal = document.getElementById('server-connection-modal');
      const input = document.getElementById('server-uri-input');
      
      expect(behavior.isModalOpen).toBe(true);
      expect(modal.style.display).toBe('flex');
      expect(input.value).toBe('https://test-server.com');
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal.opened', { type: 'serverConnection' });
    });

    it('should use existing server URI when no currentUrl provided', () => {
      behavior.showModal({});

      const input = document.getElementById('server-uri-input');
      
      expect(input.value).toBe('https://existing-server.com');
    });

    it('should setup form event listeners', () => {
      behavior.showModal({});

      const form = document.getElementById('server-connection-form');
      const testBtn = document.getElementById('test-connection-btn');
      const closeBtn = document.querySelector('.modal-close');

      expect(behavior.formEventListeners.length).toBeGreaterThan(0);
    });
  });

  describe('hideModal', () => {
    let behavior;

    beforeEach(async () => {
      behavior = new ServerConnectionBehavior(mockEventBus);
      await behavior.initialize();
      behavior.isModalOpen = true;
    });

    it('should hide modal and reset state', () => {
      behavior.hideModal();

      const modal = document.getElementById('server-connection-modal');
      
      expect(behavior.isModalOpen).toBe(false);
      expect(modal.style.display).toBe('none');
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal.closed', { type: 'serverConnection' });
    });

    it('should clear form event listeners', () => {
      // Add some mock event listeners
      behavior.formEventListeners = [
        { element: document, event: 'click', handler: jest.fn() },
      ];

      behavior.hideModal();

      expect(behavior.formEventListeners).toHaveLength(0);
    });
  });

  describe('handleTestConnection', () => {
    let behavior;

    beforeEach(async () => {
      behavior = new ServerConnectionBehavior(mockEventBus);
      await behavior.initialize();
      mockServerConnectionService.validateServerUri.mockReturnValue(true);
    });

    it('should test valid connection successfully', async () => {
      const uri = 'https://test-server.com';
      mockServerConnectionService.testConnection.mockResolvedValue(true);

      const input = document.getElementById('server-uri-input');
      input.value = uri;

      await behavior.handleTestConnection();

      expect(mockServerConnectionService.validateServerUri).toHaveBeenCalledWith(uri);
      expect(mockServerConnectionService.testConnection).toHaveBeenCalledWith(uri);
      expect(mockNotificationManager.success).toHaveBeenCalledWith(
        'Connection test successful! Server is reachable.'
      );
    });

    it('should handle failed connection test', async () => {
      const uri = 'https://unreachable-server.com';
      mockServerConnectionService.testConnection.mockResolvedValue(false);

      const input = document.getElementById('server-uri-input');
      input.value = uri;

      await behavior.handleTestConnection();

      expect(mockNotificationManager.error).toHaveBeenCalledWith(
        'Connection test failed. Please check the server URL and try again.'
      );
    });

    it('should validate URI before testing', async () => {
      mockServerConnectionService.validateServerUri.mockReturnValue(false);

      const input = document.getElementById('server-uri-input');
      input.value = 'invalid-uri';

      await behavior.handleTestConnection();

      expect(mockServerConnectionService.testConnection).not.toHaveBeenCalled();
      expect(mockNotificationManager.error).toHaveBeenCalledWith(
        'Please enter a valid HTTPS URL (e.g., https://api.example.com)'
      );
    });

    it('should disable button during test', async () => {
      const uri = 'https://test-server.com';
      mockServerConnectionService.testConnection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      const input = document.getElementById('server-uri-input');
      input.value = uri;
      const testBtn = document.getElementById('test-connection-btn');

      const testPromise = behavior.handleTestConnection();
      
      expect(testBtn.disabled).toBe(true);
      expect(testBtn.textContent).toBe('Testing...');

      await testPromise;

      expect(testBtn.disabled).toBe(false);
      expect(testBtn.textContent).toBe('Test Connection');
    });
  });

  describe('handleConnect', () => {
    let behavior;

    beforeEach(async () => {
      behavior = new ServerConnectionBehavior(mockEventBus);
      await behavior.initialize();
      mockServerConnectionService.validateServerUri.mockReturnValue(true);
      mockServerConnectionService.setServerUri.mockReturnValue(true);
    });

    it('should connect to server successfully', async () => {
      const uri = 'https://connect-server.com';
      mockServerConnectionService.testConnection.mockResolvedValue(true);

      const input = document.getElementById('server-uri-input');
      input.value = uri;

      await behavior.handleConnect();

      expect(mockServerConnectionService.setServerUri).toHaveBeenCalledWith(uri);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('connected');
      expect(mockNotificationManager.success).toHaveBeenCalledWith(
        'Successfully connected to server!'
      );
      expect(behavior.isModalOpen).toBe(false);
    });

    it('should handle connection failure', async () => {
      const uri = 'https://failing-server.com';
      mockServerConnectionService.testConnection.mockResolvedValue(false);

      const input = document.getElementById('server-uri-input');
      input.value = uri;
      behavior.isModalOpen = true; // Modal should be open before connection attempt

      await behavior.handleConnect();

      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockNotificationManager.error).toHaveBeenCalledWith(
        'Failed to connect to server. Please check the URL and try again.'
      );
      expect(behavior.isModalOpen).toBe(true);
    });

    it('should validate URI before connecting', async () => {
      mockServerConnectionService.validateServerUri.mockReturnValue(false);

      const input = document.getElementById('server-uri-input');
      input.value = 'invalid-uri';

      await behavior.handleConnect();

      expect(mockServerConnectionService.setServerUri).not.toHaveBeenCalled();
      expect(mockNotificationManager.error).toHaveBeenCalledWith(
        'Please enter a valid HTTPS URL (e.g., https://api.example.com)'
      );
    });

    it('should disable form during connection', async () => {
      const uri = 'https://slow-server.com';
      mockServerConnectionService.testConnection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      const input = document.getElementById('server-uri-input');
      input.value = uri;
      const connectBtn = document.getElementById('connect-server-btn');

      const connectPromise = behavior.handleConnect();
      
      expect(behavior.isConnecting).toBe(true);
      expect(connectBtn.disabled).toBe(true);
      expect(connectBtn.textContent).toBe('Connecting...');

      await connectPromise;

      expect(behavior.isConnecting).toBe(false);
      expect(connectBtn.disabled).toBe(false);
      expect(connectBtn.textContent).toBe('Connect');
    });
  });

  describe('updateConnectionUI', () => {
    let behavior;

    beforeEach(async () => {
      behavior = new ServerConnectionBehavior(mockEventBus);
      await behavior.initialize();
    });

    it('should update UI for connected state', () => {
      const connectionState = {
        serverUri: 'https://connected-server.com',
        isConnected: true,
        connectionStatus: 'connected',
      };
      mockServerConnectionService.getConnectionState.mockReturnValue(connectionState);

      behavior.updateConnectionUI();

      const input = document.getElementById('server-uri-input');
      const connectBtn = document.getElementById('connect-server-btn');

      expect(input.value).toBe('https://connected-server.com');
      expect(connectBtn.textContent).toBe('Connected');
      expect(connectBtn.classList.contains('connected')).toBe(true);
    });

    it('should update UI for disconnected state', () => {
      const connectionState = {
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      };
      mockServerConnectionService.getConnectionState.mockReturnValue(connectionState);

      behavior.updateConnectionUI();

      const connectBtn = document.getElementById('connect-server-btn');

      expect(connectBtn.textContent).toBe('Connect');
      expect(connectBtn.classList.contains('connected')).toBe(false);
    });

    it('should update UI for error state', () => {
      const connectionState = {
        serverUri: 'https://error-server.com',
        isConnected: false,
        connectionStatus: 'error',
      };
      mockServerConnectionService.getConnectionState.mockReturnValue(connectionState);

      behavior.updateConnectionUI();

      const connectBtn = document.getElementById('connect-server-btn');

      expect(connectBtn.textContent).toBe('Retry Connection');
      expect(connectBtn.classList.contains('error')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', async () => {
      const behavior = new ServerConnectionBehavior(mockEventBus);
      await behavior.initialize();
      behavior.isModalOpen = true;

      await behavior.destroy();

      expect(behavior.isInitialized).toBe(false);
      expect(behavior.eventBus).toBe(null);
      expect(behavior.isModalOpen).toBe(false);
    });
  });
});