// tests/unit/services/ProviderCoordinator.test.js

// Create focused mock objects for this test suite
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

// Mock dependencies
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: mockEventBus,
}));

jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
}));

const {
  ProviderCoordinator,
} = require('../../../src/js/services/ProviderCoordinator.js');

// Helper function to create mock providers with required interface
function createMockProvider(name, additionalMethods = {}) {
  return {
    constructor: { name },
    // Required DataProvider interface methods
    getSnapshot: jest.fn().mockReturnValue({ data: { n: [], c: [] } }),
    importJSON: jest.fn().mockResolvedValue(),
    exportJSON: jest.fn().mockReturnValue('{"data":{"n":[],"c":[]}}'),
    subscribe: jest.fn().mockReturnValue(() => {}),
    // Optional provider-specific methods
    ...additionalMethods,
  };
}

describe('ProviderCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ProviderCoordinator state before each test
    ProviderCoordinator._reset?.(); // Will be implemented during GREEN phase
  });

  describe('Provider Registration', () => {
    describe('Basic Registration', () => {
      it('should register a provider successfully', () => {
        const mockProvider = createMockProvider('ServerClient');

        ProviderCoordinator.registerProvider(mockProvider);

        expect(ProviderCoordinator.getRegisteredProviders()).toContain(
          mockProvider,
        );
        expect(ProviderCoordinator.currentProvider).toBe(null); // No auto-activation
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'provider.registered',
          expect.objectContaining({
            name: 'ServerClient',
            provider: mockProvider,
            timestamp: expect.any(String),
          }),
        );
      });

      it('should register multiple providers', () => {
        const serverClient = createMockProvider('ServerClient');
        const yjsProvider = createMockProvider('YjsProvider');

        ProviderCoordinator.registerProvider(serverClient);
        ProviderCoordinator.registerProvider(yjsProvider);

        const registered = ProviderCoordinator.getRegisteredProviders();
        expect(registered).toContain(serverClient);
        expect(registered).toContain(yjsProvider);
        expect(registered).toHaveLength(2);
      });

      it('should return provider by name', () => {
        const mockProvider = createMockProvider('ServerClient');
        ProviderCoordinator.registerProvider(mockProvider);

        const retrieved = ProviderCoordinator.getProvider('ServerClient');
        expect(retrieved).toBe(mockProvider);
      });

      it('should return null for unregistered provider', () => {
        const retrieved = ProviderCoordinator.getProvider('NonExistent');
        expect(retrieved).toBe(null);
      });
    });

    describe('Provider Interface Validation', () => {
      it('should validate provider interface before registration', () => {
        const invalidProvider = {
          constructor: { name: 'InvalidProvider' },
          // Missing required methods: getSnapshot, importJSON, exportJSON, subscribe
        };

        expect(() => {
          ProviderCoordinator.registerProvider(invalidProvider);
        }).toThrow(
          'Provider must implement required interface: getSnapshot, importJSON, exportJSON, subscribe',
        );
      });

      it('should accept provider with all required methods', () => {
        const validProvider = createMockProvider('ValidProvider');

        expect(() => {
          ProviderCoordinator.registerProvider(validProvider);
        }).not.toThrow();
      });

      it('should validate individual missing methods', () => {
        const partialProvider = {
          constructor: { name: 'PartialProvider' },
          getSnapshot: jest.fn(),
          importJSON: jest.fn(),
          // Missing: exportJSON, subscribe
        };

        expect(() => {
          ProviderCoordinator.registerProvider(partialProvider);
        }).toThrow(
          'Provider must implement required interface: exportJSON, subscribe',
        );
      });

      it('should reject provider without constructor name', () => {
        const anonymousProvider = {
          getSnapshot: jest.fn(),
          importJSON: jest.fn(),
          exportJSON: jest.fn(),
          subscribe: jest.fn(),
          // Missing: constructor.name
        };

        expect(() => {
          ProviderCoordinator.registerProvider(anonymousProvider);
        }).toThrow('Provider must have a constructor name');
      });
    });

    describe('Duplicate Registration Prevention', () => {
      it('should prevent duplicate provider registration', () => {
        const provider = createMockProvider('ServerClient');

        ProviderCoordinator.registerProvider(provider);

        expect(() => {
          ProviderCoordinator.registerProvider(provider);
        }).toThrow('Provider ServerClient is already registered');
      });

      it('should allow different providers with same interface', () => {
        const serverClient = createMockProvider('ServerClient');
        const yjsProvider = createMockProvider('YjsProvider');

        expect(() => {
          ProviderCoordinator.registerProvider(serverClient);
          ProviderCoordinator.registerProvider(yjsProvider);
        }).not.toThrow();
      });

      it('should prevent registration of providers with same name but different instances', () => {
        const provider1 = createMockProvider('ServerClient');
        const provider2 = createMockProvider('ServerClient'); // Same name, different instance

        ProviderCoordinator.registerProvider(provider1);

        expect(() => {
          ProviderCoordinator.registerProvider(provider2);
        }).toThrow('Provider ServerClient is already registered');
      });
    });

    describe('Provider Unregistration', () => {
      it('should unregister a provider by name', () => {
        const mockProvider = createMockProvider('ServerClient');
        ProviderCoordinator.registerProvider(mockProvider);

        const unregistered =
          ProviderCoordinator.unregisterProvider('ServerClient');

        expect(unregistered).toBe(mockProvider);
        expect(ProviderCoordinator.getProvider('ServerClient')).toBe(null);
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'provider.unregistered',
          expect.objectContaining({
            name: 'ServerClient',
            provider: mockProvider,
          }),
        );
      });

      it('should return null when unregistering non-existent provider', () => {
        const result = ProviderCoordinator.unregisterProvider('NonExistent');
        expect(result).toBe(null);
      });

      it('should handle unregistering current provider', () => {
        const mockProvider = createMockProvider('ServerClient');
        ProviderCoordinator.registerProvider(mockProvider);

        // For now, just verify unregistration works even if it was the current provider
        // Full current provider logic will be implemented in Phase 2 (Provider Switching)
        const unregistered =
          ProviderCoordinator.unregisterProvider('ServerClient');
        expect(unregistered).toBe(mockProvider);
        expect(ProviderCoordinator.getProvider('ServerClient')).toBe(null);
      });
    });
  });
});
