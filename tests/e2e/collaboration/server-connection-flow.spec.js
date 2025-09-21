/**
 * E2E Tests - Complete Server Connection Flow
 *
 * Tests the end-to-end user experience for server connection and collaboration.
 * Uses mock server to test complete UX flow without real server dependency.
 *
 * Phase 3: Complete UX Flow validation
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from '../helpers/CanvasPage.js';

test.describe('Server Connection Flow @collaboration @local-only', () => {
  let canvasPage;
  let mockServer;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);

    // Setup mock server responses
    await page.route('**/api/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'MindMeld Collaboration Server',
          version: '1.0.0',
          websocket: true,
          status: 'healthy',
        }),
      });
    });

    await page.route('**/api/maps', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          maps: [
            {
              id: 'test-collab-map-1',
              name: 'Test Collaboration Map',
              created: '2025-01-01T00:00:00Z',
              modified: '2025-01-01T12:00:00Z',
              collaborators: 2,
            },
            {
              id: 'test-collab-map-2',
              name: 'Another Shared Map',
              created: '2025-01-02T00:00:00Z',
              modified: '2025-01-02T15:30:00Z',
              collaborators: 1,
            },
          ],
          total: 2,
          page: 1,
        }),
      });
    });

    // Mock WebSocket connection for collaboration
    await page.addInitScript(() => {
      window.mockWebSocketConnections = [];

      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class MockWebSocket extends EventTarget {
        constructor(url) {
          super();
          this.url = url;
          this.readyState = WebSocket.CONNECTING;
          window.mockWebSocketConnections.push(this);

          // Simulate successful connection
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.dispatchEvent(new Event('open'));
          }, 100);
        }

        send(data) {
          // Simulate echo for collaboration testing
          setTimeout(() => {
            this.dispatchEvent(new MessageEvent('message', { data }));
          }, 50);
        }

        close() {
          this.readyState = WebSocket.CLOSED;
          this.dispatchEvent(new Event('close'));
        }
      };
    });

    await canvasPage.load();
  });

  test('Complete Server Connection Flow', async ({ page }) => {
    // RED: End-to-end UX validation

    // 1. User opens kebab menu
    await canvasPage.openKebabMenu();
    await expect(
      canvasPage.page.locator('#kebab-context-menu.open'),
    ).toBeVisible();

    // 2. User clicks "Connect to Server"
    await canvasPage.clickMenuItem('connect-server');
    await expect(
      canvasPage.page.locator('#server-connection-modal'),
    ).toBeVisible();

    // 3. User enters server URL
    const serverUrlInput = canvasPage.page.locator('#server-uri-input');
    await serverUrlInput.fill('https://mock-server.example.com');

    // 4. User clicks Connect button
    await canvasPage.page.click('#connect-server-btn');

    // 5. Should validate server and show success
    await expect(canvasPage.page.locator('#connection-status')).toContainText(
      'Connected',
    );

    // 6. Modal should close automatically
    await expect(
      canvasPage.page.locator('#server-connection-modal'),
    ).toBeHidden();

    // 7. Server menu options should now be visible
    await canvasPage.openKebabMenu();
    await expect(
      canvasPage.page.locator('.server-disconnect-item'),
    ).toBeVisible();
    await expect(
      canvasPage.page.locator('.server-browse-maps-item'),
    ).toBeVisible();
  });

  test('Browse and Load Map Flow', async ({ page }) => {
    // RED: Complete map loading flow

    // Setup: Connect to server first
    await canvasPage.connectToMockServer('https://mock-server.example.com');

    // 1. User opens kebab menu and clicks "Browse Maps"
    await canvasPage.openKebabMenu();
    await canvasPage.clickMenuItem('browse-maps');

    // 2. Map selection modal should open
    await expect(canvasPage.page.locator('#map-selection-modal')).toBeVisible();

    // 3. Maps should be loaded and displayed
    await expect(canvasPage.page.locator('.maps-list')).toBeVisible();
    await expect(canvasPage.page.locator('.map-item').first()).toBeVisible();

    // 4. User selects a map
    await canvasPage.page.click('.map-item[data-map-id="test-collab-map-1"]');

    // 5. Load button should be enabled
    const loadButton = canvasPage.page.locator('#load-selected-map-btn');
    await expect(loadButton).toBeEnabled();

    // 6. User clicks Load Map
    await loadButton.click();

    // 7. Should close modal and establish WebSocket connection
    await expect(canvasPage.page.locator('#map-selection-modal')).toBeHidden();

    // 8. Verify WebSocket connection was established
    const wsConnections = await canvasPage.page.evaluate(
      () => window.mockWebSocketConnections,
    );
    expect(wsConnections.length).toBeGreaterThan(0);
    expect(wsConnections[0].url).toContain('test-collab-map-1');
  });

  test('WebSocket-Only Loading Validation', async ({ page }) => {
    // RED: Ensure no REST calls during map loading

    let restCallsMade = [];

    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      if (
        url.includes('/api/') &&
        !url.includes('/health') &&
        !url.includes('/maps')
      ) {
        restCallsMade.push({
          url,
          method: request.method(),
        });
      }
    });

    // Connect and load map
    await canvasPage.connectToMockServer('https://mock-server.example.com');
    await canvasPage.loadMap('test-collab-map-1');

    // Wait for any potential REST calls
    await canvasPage.page.waitForTimeout(2000);

    // Verify no REST calls were made during map loading
    expect(restCallsMade).toHaveLength(0);

    // Verify WebSocket connection exists
    const connectionType = await canvasPage.getConnectionType();
    expect(connectionType).toBe('websocket');
  });

  test('Collaboration Event Flow', async ({ page }) => {
    // RED: Test collaborative interaction flow

    // Setup: Connect and load map
    await canvasPage.connectToMockServer('https://mock-server.example.com');
    await canvasPage.loadMap('test-collab-map-1');

    // 1. Create a note (should trigger WebSocket message)
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.editNote(note, 'Collaborative Test Note');

    // 2. Verify WebSocket activity
    const wsMessages = await canvasPage.page.evaluate(() => {
      const connections = window.mockWebSocketConnections;
      return connections.length > 0 ? connections[0].sentMessages || [] : [];
    });

    expect(wsMessages.length).toBeGreaterThan(0);

    // 3. Simulate receiving collaborative update
    await canvasPage.page.evaluate(() => {
      const connections = window.mockWebSocketConnections;
      if (connections.length > 0) {
        const mockCollabUpdate = JSON.stringify({
          type: 'note-created',
          noteId: 'collab-note-1',
          content: 'Note from collaborator',
          position: [200, 150],
          origin: 'collaboration',
        });

        connections[0].dispatchEvent(
          new MessageEvent('message', {
            data: mockCollabUpdate,
          }),
        );
      }
    });

    // 4. Wait for collaborative update to be processed
    await canvasPage.page.waitForTimeout(500);

    // 5. Verify collaborative note appears (when implementation is complete)
    // This will initially fail (RED phase) until WebSocketYjsProvider is implemented
    // await expect(canvasPage.page.locator('.note').nth(1)).toBeVisible();
  });

  test('Server Disconnection Flow', async ({ page }) => {
    // RED: Disconnection and cleanup flow

    // Setup: Connect to server
    await canvasPage.connectToMockServer('https://mock-server.example.com');
    await canvasPage.loadMap('test-collab-map-1');

    // 1. User opens kebab menu and disconnects
    await canvasPage.openKebabMenu();
    await canvasPage.clickMenuItem('disconnect-server');

    // 2. Should close WebSocket connection
    const wsConnections = await canvasPage.page.evaluate(() => {
      return window.mockWebSocketConnections.map((ws) => ({
        url: ws.url,
        readyState: ws.readyState,
      }));
    });

    expect(wsConnections[0].readyState).toBe(WebSocket.CLOSED);

    // 3. Server menu options should be hidden
    await canvasPage.openKebabMenu();
    await expect(
      canvasPage.page.locator('.server-disconnect-item'),
    ).toBeHidden();
    await expect(
      canvasPage.page.locator('.server-browse-maps-item'),
    ).toBeHidden();
    await expect(canvasPage.page.locator('.server-connect-item')).toBeVisible();
  });

  test('Error Handling - Invalid Server URL', async ({ page }) => {
    // RED: Server validation error handling

    await canvasPage.openKebabMenu();
    await canvasPage.clickMenuItem('connect-server');

    // Enter invalid URL
    const serverUrlInput = canvasPage.page.locator('#server-uri-input');
    await serverUrlInput.fill('invalid-url');

    await canvasPage.page.click('#connect-server-btn');

    // Should show error message
    await expect(canvasPage.page.locator('#connection-status')).toContainText(
      'Invalid',
    );
  });

  test('Error Handling - Server Connection Failure', async ({ page }) => {
    // RED: Network error handling

    // Setup server to return error
    await page.route('**/api/health', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server unavailable' }),
      });
    });

    await canvasPage.openKebabMenu();
    await canvasPage.clickMenuItem('connect-server');

    const serverUrlInput = canvasPage.page.locator('#server-uri-input');
    await serverUrlInput.fill('https://failing-server.example.com');

    await canvasPage.page.click('#connect-server-btn');

    // Should show connection error
    await expect(canvasPage.page.locator('#connection-status')).toContainText(
      'Failed',
    );
  });

  test('Map Search and Filtering', async ({ page }) => {
    // RED: Map discovery UX

    await canvasPage.connectToMockServer('https://mock-server.example.com');

    await canvasPage.openKebabMenu();
    await canvasPage.clickMenuItem('browse-maps');

    // Search for specific map
    const searchInput = canvasPage.page.locator('#map-search-input');
    await searchInput.fill('Collaboration');

    // Should filter map list
    await expect(canvasPage.page.locator('.map-item')).toHaveCount(1);
    await expect(canvasPage.page.locator('.map-item').first()).toContainText(
      'Test Collaboration Map',
    );

    // Clear search
    await searchInput.fill('');

    // Should show all maps again
    await expect(canvasPage.page.locator('.map-item')).toHaveCount(2);
  });

  test('Create New Map Flow', async ({ page }) => {
    // RED: New map creation flow

    // Mock map creation endpoint
    await page.route('**/api/maps', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-map-123',
            name: 'New Collaboration Map',
            created: new Date().toISOString(),
          }),
        });
      }
    });

    await canvasPage.connectToMockServer('https://mock-server.example.com');

    await canvasPage.openKebabMenu();
    await canvasPage.clickMenuItem('browse-maps');

    // Click "Create New Map"
    await canvasPage.page.click('#create-new-map-btn');

    // Should show creation form/modal
    await expect(canvasPage.page.locator('#create-map-modal')).toBeVisible();

    // Fill out map details
    await canvasPage.page.fill(
      '#new-map-name-input',
      'My New Collaboration Map',
    );
    await canvasPage.page.click('#create-map-submit-btn');

    // Should create map and start loading it
    await expect(canvasPage.page.locator('#create-map-modal')).toBeHidden();
    await expect(canvasPage.page.locator('#map-selection-modal')).toBeHidden();

    // Verify WebSocket connection for new map
    const wsConnections = await canvasPage.page.evaluate(
      () => window.mockWebSocketConnections,
    );
    expect(wsConnections.some((ws) => ws.url.includes('new-map-123'))).toBe(
      true,
    );
  });
});
