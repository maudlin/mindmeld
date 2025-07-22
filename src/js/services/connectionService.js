// connectionService.js - Service layer for connection operations
import { CONNECTION_TYPES } from '../core/constants.js';

export class ConnectionService {
  static connectionManager = null;
  static dataStoreUpdateCallback = null;

  static setConnectionManager(manager) {
    this.connectionManager = manager;
    // Wire up the callback
    if (manager && this.dataStoreUpdateCallback) {
      manager.setConnectionUpdateCallback(this.dataStoreUpdateCallback);
    }
  }

  static setDataStoreUpdateCallback(callback) {
    this.dataStoreUpdateCallback = callback;
    // Wire up the callback if manager is already set
    if (this.connectionManager && callback) {
      this.connectionManager.setConnectionUpdateCallback(callback);
    }
  }

  static createConnection(fromId, toId, type) {
    if (this.connectionManager) {
      this.connectionManager.createConnection(fromId, toId, type);
    }
  }

  static updateConnections() {
    if (this.connectionManager) {
      this.connectionManager.updateConnections();
    }
  }

  static initializeConnectionDrawing(canvas) {
    if (this.connectionManager) {
      return this.connectionManager.initializeConnectionDrawing(canvas);
    }
    return null;
  }

  static getConnectionTypes() {
    return CONNECTION_TYPES;
  }
}
