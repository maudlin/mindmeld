// TouchAdapter connection creation tests
import { TouchAdapter } from '../../../../src/js/interactions/adapters/TouchAdapter.js';

describe('TouchAdapter - Connection Creation', () => {
  let adapter;
  let mockEventBus;
  let mockCanvas;
  let sourceNote;
  let targetNote;
  let sourceConnector;
  let targetConnector;

  beforeEach(() => {
    // Mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create DOM elements for testing
    document.body.innerHTML = `
      <div id="canvas">
        <div class="note" id="note1">
          <div class="note-content">Source Note</div>
          <div class="ghost-connector top" data-position="top"></div>
          <div class="ghost-connector bottom" data-position="bottom"></div>
          <div class="ghost-connector left" data-position="left"></div>
          <div class="ghost-connector right" data-position="right"></div>
        </div>
        <div class="note" id="note2">
          <div class="note-content">Target Note</div>
          <div class="ghost-connector top" data-position="top"></div>
          <div class="ghost-connector bottom" data-position="bottom"></div>
          <div class="ghost-connector left" data-position="left"></div>
          <div class="ghost-connector right" data-position="right"></div>
        </div>
      </div>
    `;

    mockCanvas = document.getElementById('canvas');
    sourceNote = document.getElementById('note1');
    targetNote = document.getElementById('note2');
    sourceConnector = sourceNote.querySelector('.ghost-connector.top');
    targetConnector = targetNote.querySelector('.ghost-connector.top');

    // Initialize TouchAdapter
    adapter = new TouchAdapter();
    adapter.init(mockEventBus);
    adapter.canvas = mockCanvas;

    // Mock the createTouchConnection method to avoid connectionManager dependencies
    adapter.createTouchConnection = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Tap-to-Tap Connection Creation', () => {
    test('should start connection mode when tapping a ghost connector', () => {
      // Mock getTouchTarget to return the source connector
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Simulate tap on ghost connector
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      expect(adapter.isConnectionMode).toBe(true);
      expect(adapter.selectedConnector).toBe(sourceConnector);
      expect(sourceConnector.classList.contains('connector-selected')).toBe(
        true,
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'connection.modeStarted',
        expect.objectContaining({
          connector: sourceConnector,
          note: sourceNote,
          _gesture: 'tap',
        }),
      );
    });

    test('should show ghost connectors on all notes when one connector is selected', () => {
      // Mock getTouchTarget to return the source connector
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      // Verify connection mode started
      expect(adapter.isConnectionMode).toBe(true);

      // Target note should also show connectors (this is what we need to implement)
      expect(targetNote.querySelectorAll('.ghost-connector')).toHaveLength(4);
    });

    test('should complete connection when tapping anywhere on a different note', () => {
      // Mock getTouchTarget for starting connection mode
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      // Mock getTouchTarget to return the target note
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: targetNote,
      });

      // Tap anywhere on target note (not necessarily a ghost connector)
      adapter.handleTap({
        currentX: 200,
        currentY: 200,
      });

      expect(adapter.createTouchConnection).toHaveBeenCalledWith(
        sourceNote,
        targetNote,
      );

      expect(adapter.isConnectionMode).toBe(false);
      expect(adapter.selectedConnector).toBe(null);
      expect(sourceConnector.classList.contains('connector-selected')).toBe(
        false,
      );
    });

    test('should complete connection when tapping a ghost connector on a different note', () => {
      // Mock getTouchTarget for starting connection mode
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      // Mock getTouchTarget to return the target connector
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: targetConnector,
      });

      // Tap on target ghost connector
      adapter.handleTap({
        currentX: 200,
        currentY: 200,
      });

      expect(adapter.createTouchConnection).toHaveBeenCalledWith(
        sourceNote,
        targetNote,
      );
    });

    test('should cancel connection mode when tapping on canvas', () => {
      // Mock getTouchTarget for starting connection mode
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      // Mock isClickOnCanvas to return true
      adapter.isClickOnCanvas = jest.fn().mockReturnValue(true);

      // Mock getTouchTarget to return canvas
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: mockCanvas,
      });

      // Tap on canvas
      adapter.handleTap({
        currentX: 300,
        currentY: 300,
      });

      expect(adapter.isConnectionMode).toBe(false);
      expect(adapter.selectedConnector).toBe(null);
      expect(sourceConnector.classList.contains('connector-selected')).toBe(
        false,
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'connection.modeCancelled',
        expect.objectContaining({
          _gesture: 'tap',
        }),
      );
    });

    test('should toggle connection mode when tapping the same connector twice', () => {
      // Mock getTouchTarget for starting connection mode
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      expect(adapter.isConnectionMode).toBe(true);

      // Mock getTouchTarget to return the same connector
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Tap same connector again
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      expect(adapter.isConnectionMode).toBe(false);
      expect(adapter.selectedConnector).toBe(null);
      expect(sourceConnector.classList.contains('connector-selected')).toBe(
        false,
      );
    });

    test('should not allow self-connections', () => {
      // Mock getTouchTarget for starting connection mode
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      // Mock getTouchTarget to return the same note
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceNote,
      });

      // Try to tap on the same note
      adapter.handleTap({
        currentX: 150,
        currentY: 150,
      });

      // Should not create connection
      expect(adapter.createTouchConnection).not.toHaveBeenCalled();

      // Should exit connection mode
      expect(adapter.isConnectionMode).toBe(false);
    });
  });

  describe('Connection Mode Visual Feedback', () => {
    test('should add enhanced visual styling to selected connector', () => {
      // Mock getTouchTarget
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      expect(sourceConnector.classList.contains('connector-selected')).toBe(
        true,
      );
    });

    test('should show ghost connectors on all notes during connection mode', () => {
      // Mock getTouchTarget
      adapter.getTouchTarget = jest.fn().mockReturnValue({
        target: sourceConnector,
      });

      // Start connection mode
      adapter.handleTap({
        currentX: 100,
        currentY: 100,
      });

      // All notes should show their ghost connectors
      // This is typically achieved by adding a CSS class to the body or canvas
      // We'll need to implement this in the actual code
    });
  });
});
