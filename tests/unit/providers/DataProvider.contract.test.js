/* eslint-env jest */

import {
  DataProvider,
  ORIGIN,
  isValidOrigin,
  makeConnectionId,
} from '../../../src/js/data/providers/DataProvider.js';
import { YjsProvider } from '../../../src/js/data/providers/YjsProvider.js';
import { LocalJSONProvider } from '../../../src/js/data/providers/LocalJSONProvider.js';

class DummyProvider extends DataProvider {
  init() {
    return () => {};
  }
  subscribe() {
    return () => {};
  }
  getSnapshot() {
    return { data: { n: [], c: [] } };
  }
  importJSON() {}
  exportJSON() {
    return JSON.stringify(this.getSnapshot());
  }
  upsertNote() {}
  deleteNote() {}
  upsertConnection() {}
  deleteConnection() {}
  setMeta() {}
  getMeta() {
    return {
      zoomLevel: 5,
      canvasType: 'Standard Canvas',
      mapName: 'Untitled Map',
    };
  }
}

describe('DataProvider contract', () => {
  test('exports ORIGIN and validator', () => {
    expect(ORIGIN.USER).toBe('user');
    expect(ORIGIN.SYSTEM).toBe('system');
    expect(isValidOrigin('user')).toBe(true);
    expect(isValidOrigin('system')).toBe(true);
    expect(isValidOrigin('nope')).toBe(false);
  });

  test('makeConnectionId is direction-inclusive', () => {
    expect(makeConnectionId('A', 'B', 1)).toBe('A:B:1');
    expect(makeConnectionId('B', 'A', 1)).toBe('B:A:1');
    expect(makeConnectionId('A', 'B', 2)).toBe('A:B:2');
  });

  test('abstract methods surface exists via subclass', () => {
    const p = new DummyProvider();
    expect(typeof p.init).toBe('function');
    expect(typeof p.subscribe).toBe('function');
    expect(typeof p.getSnapshot).toBe('function');
    expect(typeof p.importJSON).toBe('function');
    expect(typeof p.exportJSON).toBe('function');
    expect(typeof p.upsertNote).toBe('function');
    expect(typeof p.deleteNote).toBe('function');
    expect(typeof p.upsertConnection).toBe('function');
    expect(typeof p.deleteConnection).toBe('function');
    expect(typeof p.setMeta).toBe('function');
    expect(typeof p.getMeta).toBe('function');
  });

  test('YjsProvider skeleton is a DataProvider', async () => {
    const y = new YjsProvider();
    const cleanup = await y.init(null, { onReady: () => {} });
    expect(typeof cleanup).toBe('function');
    expect(typeof y.getSnapshot()).toBe('object');
    y.setMeta({ mapName: 'Test' });
    expect(y.getMeta().mapName).toBe('Test');
    y.upsertNote({ id: 'n1', content: 'c', pos: [1, 2], color: 'blue' });
    const snap1 = y.getSnapshot();
    expect(Array.isArray(snap1.data.n)).toBe(true);
    y.upsertConnection({ from: 'n1', to: 'n2', type: 1 });
    const snap2 = y.getSnapshot();
    expect(Array.isArray(snap2.data.c)).toBe(true);
    cleanup();
  });

  test('LocalJSONProvider implements DataProvider contract', () => {
    // Mock DOM canvas element for LocalJSONProvider
    document.body.innerHTML = '<div id="canvas"></div>';

    const provider = new LocalJSONProvider();

    // Test basic interface compliance
    expect(provider).toBeInstanceOf(DataProvider);
    expect(typeof provider.init).toBe('function');
    expect(typeof provider.destroy).toBe('function');
    expect(typeof provider.subscribe).toBe('function');
    expect(typeof provider.getSnapshot).toBe('function');
    expect(typeof provider.importJSON).toBe('function');
    expect(typeof provider.exportJSON).toBe('function');
    expect(typeof provider.upsertNote).toBe('function');
    expect(typeof provider.deleteNote).toBe('function');
    expect(typeof provider.upsertConnection).toBe('function');
    expect(typeof provider.deleteConnection).toBe('function');
    expect(typeof provider.setMeta).toBe('function');
    expect(typeof provider.getMeta).toBe('function');

    // Test initialization
    const cleanup = provider.init('test-map', { onReady: () => {} });
    expect(typeof cleanup).toBe('function');

    // Test snapshot operations
    const snapshot = provider.getSnapshot();
    expect(typeof snapshot).toBe('object');
    expect(snapshot.data).toBeDefined();

    // Test meta operations
    const initialMeta = provider.getMeta();
    expect(typeof initialMeta.zoomLevel).toBe('number');
    expect(typeof initialMeta.canvasType).toBe('string');

    provider.setMeta({ mapName: 'Contract Test Map' });
    const updatedMeta = provider.getMeta();
    expect(updatedMeta.mapName).toBe('Contract Test Map');

    // Test subscription system
    let lastChange = null;
    const unsubscribe = provider.subscribe((change) => {
      lastChange = change;
    });
    expect(typeof unsubscribe).toBe('function');

    // Test note operations trigger notifications
    provider.upsertNote({
      id: 'test-note',
      content: 'test content',
      pos: [100, 200],
    });
    expect(lastChange).toBeTruthy();
    expect(lastChange.type).toBe('notes');
    expect(lastChange.origin).toBe('user');

    // Test connection operations
    provider.upsertConnection({
      from: 'test-note',
      to: 'test-note-2',
      type: 1,
    });
    expect(lastChange.type).toBe('connections');

    // Test autosave control
    expect(typeof provider.pauseAutosave).toBe('function');
    expect(typeof provider.resumeAutosave).toBe('function');

    // Test hydration control
    expect(typeof provider.hydrationInProgress).toBe('boolean');
    expect(provider.hydrationInProgress).toBe(false);

    // Cleanup
    unsubscribe();
    cleanup();
    provider.destroy();

    // Clean up DOM
    document.body.innerHTML = '';
  });
});
