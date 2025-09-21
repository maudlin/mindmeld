// src/js/core/yjs-compatibility/yjs.js
// Y.js compatibility exports - mimics 'yjs' package interface

import YjsCompat, { YDoc, YMap } from './YjsCompat.js';

// Export individual classes
export { YDoc as Doc, YMap as Map };

// Export default namespace (for import * as Y)
export default YjsCompat;
