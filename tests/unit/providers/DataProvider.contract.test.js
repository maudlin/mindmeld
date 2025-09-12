/* eslint-env jest */

import {
  DataProvider,
  ORIGIN,
  isValidOrigin,
  makeConnectionId,
} from '../../../src/js/data/providers/DataProvider.js';
import { YjsProvider } from '../../../src/js/data/providers/YjsProvider.js';

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

  test('YjsProvider skeleton is a DataProvider', () => {
    const y = new YjsProvider();
    const cleanup = y.init(null, { onReady: () => {} });
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
});
