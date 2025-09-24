#!/usr/bin/env node

import fs from 'fs';

// Files with unused errorHandler imports (based on lint errors)
const filesToFix = [
  'src/js/app.js',
  'src/js/core/bootstrap/DataBootstrap.js',
  'src/js/core/bootstrap/InteractionBootstrap.js',
  'src/js/core/bootstrap/UIBootstrap.js',
  'src/js/core/canvasInitialization.js',
  'src/js/core/canvasManager.js',
  'src/js/core/canvasModule.js',
  'src/js/core/coordinates/CoordinateCache.js',
  'src/js/core/coordinates/CoordinateTransform.js',
  'src/js/core/eventBus.js',
  'src/js/core/uiSetup.js',
  'src/js/data/DataProviderCompatibility.js',
  'src/js/data/canonicalStorage.js',
  'src/js/data/dataStore.js',
  'src/js/data/providers/DataProvider.js',
  'src/js/data/providers/LocalJSONProvider.js',
  'src/js/data/providers/YjsProvider.js',
  'src/js/data/storageManager.js',
  'src/js/factories/noteFactory.js',
  'src/js/features/colorPicker/colorPickerEvents.js',
  'src/js/features/connection/connectionCreation.js',
  'src/js/features/connection/connectionManager.js',
  'src/js/features/connection/connectionUpdate.js',
  'src/js/features/connection/connectionUtils.js',
  'src/js/features/mapSelection/mapSelectionBehavior.js',
  'src/js/features/note/EditModeController.js',
  'src/js/features/note/editViewMode.js',
  'src/js/features/note/noteColorApplication.js',
  'src/js/features/serverConnection/serverConnectionBehavior.js',
  'src/js/features/zoom/viewportAdapter.js',
  'src/js/interactions/InputController.js',
  'src/js/interactions/InteractionController.js',
  'src/js/interactions/adapters/DesktopAdapter.js',
  'src/js/interactions/adapters/TouchAdapter.js',
  'src/js/interactions/behaviors/CanvasBehavior.js',
  'src/js/interactions/behaviors/ConnectionBehavior.js',
  'src/js/interactions/behaviors/DragBehavior.js',
  'src/js/interactions/behaviors/MenuBehavior.js',
  'src/js/interactions/behaviors/ModalBehavior.js',
  'src/js/interactions/behaviors/NoteBehavior.js',
  'src/js/interactions/behaviors/SelectionBoxBehavior.js',
  'src/js/interactions/behaviors/ToolbarBehavior.js',
  'src/js/interactions/behaviors/ViewportBehavior.js',
  'src/js/interactions/capabilities/detector.js',
  'src/js/interactions/pageInteractions.js',
  'src/js/services/DataProviderService.js',
  'src/js/services/canvasStateService.js',
  'src/js/services/colorService.js',
  'src/js/services/mapSafetyService.js',
  'src/js/services/markdownContentService.js',
  'src/js/services/noteEventService.js',
  'src/js/services/noteIdService.js',
  'src/js/services/noteManager.js',
  'src/js/services/noteService.js',
  'src/js/services/notificationManager.js',
  'src/js/services/serverClient.js',
  'src/js/services/serverConnectionService.js',
  'src/js/services/zoomStateService.js',
  'src/js/utils/browserDetection.js',
  'src/js/utils/utils.js',
];

function removeUnusedImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  let newContent = content
    // Remove errorHandler from imports: { logger, errorHandler } -> { logger }
    .replace(
      /import\s*\{\s*([^,}]*),\s*errorHandler\s*\}\s*from\s*(['"][^'"]*logger\.js['"];)/g,
      'import { $1 } from $2',
    )
    // Remove errorHandler from imports: { errorHandler, logger } -> { logger }
    .replace(
      /import\s*\{\s*errorHandler\s*,\s*([^}]+)\s*\}\s*from\s*(['"][^'"]*logger\.js['"];)/g,
      'import { $1 } from $2',
    )
    // Remove standalone errorHandler imports
    .replace(
      /import\s*\{\s*errorHandler\s*\}\s*from\s*['"][^'"]*logger\.js['"];\s*/g,
      '',
    );

  // Special handling for utils.js - remove unused imports completely
  if (filePath.includes('utils.js')) {
    newContent = newContent
      .replace(
        /import\s*\{[^}]*defaultLogging[^}]*\}\s*from\s*['"][^'"]*constants\.js['"];\s*/g,
        '',
      )
      .replace(
        /import\s*\{[^}]*logger[^}]*\}\s*from\s*['"][^'"]*logger\.js['"];\s*/g,
        '',
      )
      .replace(/,\s*LOGGING\s*as\s*defaultLogging/g, '')
      .replace(/LOGGING\s*as\s*defaultLogging\s*,/g, '');
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Cleaned unused imports in: ${filePath}`);
    return true;
  }
  return false;
}

// Process all files
let cleanedCount = 0;
for (const filePath of filesToFix) {
  try {
    if (removeUnusedImports(filePath)) {
      cleanedCount++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`Cleaned unused imports in ${cleanedCount} files`);
