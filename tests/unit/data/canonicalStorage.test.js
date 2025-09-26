// tests/unit/data/canonicalStorage.test.js

describe('Canonical Markdown Storage Tests', () => {
  let canonicalStorage;
  let mockLocalStorage;

  const createMockLocalStorage = () => ({
    data: {},
    getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
    setItem: jest.fn((key, value) => {
      mockLocalStorage.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete mockLocalStorage.data[key];
    }),
    clear: jest.fn(() => {
      mockLocalStorage.data = {};
    }),
  });

  beforeEach(async () => {
    jest.resetModules();

    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Import modules after setting up mocks
    const storageModule = await import(
      '../../../src/js/data/canonicalStorage.js'
    );

    canonicalStorage = storageModule;
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('Core Storage Requirements', () => {
    it('should store all notes as raw markdown strings', () => {
      const notes = [
        {
          id: 'note1',
          content: '# Header\nPlain text content',
          position: [100, 200],
        },
        {
          id: 'note2',
          content: '**Bold** and *italic* text',
          position: [300, 400],
        },
        { id: 'note3', content: '- Item 1\n- Item 2', position: [500, 600] },
      ];

      canonicalStorage.saveNotesToStorage(notes);

      const savedData = JSON.parse(mockLocalStorage.getItem('mindmeld-notes'));
      expect(savedData.notes).toHaveLength(3);

      savedData.notes.forEach((note) => {
        expect(typeof note.content).toBe('string');
        expect(note.content).not.toContain('<');
        expect(note.content).not.toContain('>');
        expect(note.content).not.toContain('&lt;');
        expect(note.content).not.toContain('&gt;');
      });
    });

    it('should enforce empty string for empty notes instead of null or undefined', () => {
      const notes = [
        { id: 'note1', content: null, position: [100, 200] },
        { id: 'note2', content: undefined, position: [300, 400] },
        { id: 'note3', content: '', position: [500, 600] },
        { id: 'note4', position: [700, 800] }, // missing content
      ];

      const processedNotes = canonicalStorage.processNotesForStorage(notes);

      processedNotes.forEach((note) => {
        expect(note.content).toBe('');
        expect(typeof note.content).toBe('string');
      });
    });

    it('should prevent HTML injection in stored content', () => {
      const maliciousNotes = [
        {
          id: 'xss1',
          content: '<script>alert("xss")</script>Safe content',
          position: [100, 200],
        },
        {
          id: 'xss2',
          content: '<div onclick="steal()">Click here</div>',
          position: [300, 400],
        },
        {
          id: 'xss3',
          content: '<img src=x onerror=alert(1)>Image',
          position: [500, 600],
        },
      ];

      const processedNotes =
        canonicalStorage.processNotesForStorage(maliciousNotes);

      processedNotes.forEach((note) => {
        expect(note.content).not.toContain('<script>');
        expect(note.content).not.toContain('onclick=');
        expect(note.content).not.toContain('onerror=');
        expect(note.content).not.toContain('alert');
        expect(note.content).not.toContain('steal()');
      });
    });
  });

  describe('Content Cleaning', () => {
    it('should extract text content from HTML and convert to markdown where possible', () => {
      const htmlNotes = [
        {
          id: 'html1',
          content: '<h1>Title</h1><p>Paragraph</p>',
          position: [100, 200],
        },
        {
          id: 'html2',
          content: '<ul><li>Item 1</li><li>Item 2</li></ul>',
          position: [300, 400],
        },
        { id: 'plain', content: 'Plain text content', position: [500, 600] },
      ];

      const processedNotes = canonicalStorage.processNotesForStorage(htmlNotes);

      expect(processedNotes[0].content).toContain('Title');
      expect(processedNotes[0].content).toContain('Paragraph');
      expect(processedNotes[0].content).not.toContain('<h1>');
      expect(processedNotes[0].content).not.toContain('<p>');

      expect(processedNotes[1].content).toContain('Item 1');
      expect(processedNotes[1].content).toContain('Item 2');
      expect(processedNotes[1].content).not.toContain('<ul>');
      expect(processedNotes[1].content).not.toContain('<li>');

      expect(processedNotes[2].content).toBe('Plain text content');
    });

    it('should handle HTML entities by extracting text content', () => {
      const entityNotes = [
        {
          id: 'entities',
          content: '&lt;div&gt;Encoded&lt;/div&gt;',
          position: [100, 200],
        },
        {
          id: 'mixed',
          content: 'Plain &amp; encoded content',
          position: [300, 400],
        },
      ];

      const processedNotes =
        canonicalStorage.processNotesForStorage(entityNotes);

      expect(processedNotes[0].content).toBe('Encoded');
      expect(processedNotes[0].content).not.toContain('&lt;');
      expect(processedNotes[0].content).not.toContain('&gt;');

      expect(processedNotes[1].content).toBe('Plain & encoded content');
      expect(processedNotes[1].content).not.toContain('&amp;');
    });

    it('should preserve valid markdown and plain text', () => {
      const cleanNotes = [
        {
          id: 'markdown',
          content: '# Header\n**Bold** text',
          position: [100, 200],
        },
        { id: 'plain', content: 'Just plain text', position: [300, 400] },
      ];

      const processedNotes =
        canonicalStorage.processNotesForStorage(cleanNotes);

      expect(processedNotes[0].content).toBe('# Header\n**Bold** text');
      expect(processedNotes[1].content).toBe('Just plain text');
    });
  });

  describe('Storage Format Validation', () => {
    it('should enforce consistent storage format structure', () => {
      const notes = [{ id: 'note1', content: '# Test', position: [100, 200] }];

      canonicalStorage.saveNotesToStorage(notes);
      const savedData = JSON.parse(mockLocalStorage.getItem('mindmeld-notes'));

      expect(savedData).toHaveProperty('version');
      expect(savedData).toHaveProperty('notes');
      expect(savedData).toHaveProperty('timestamp');
      expect(Array.isArray(savedData.notes)).toBe(true);
    });

    it('should validate note structure before storage', () => {
      const invalidNotes = [
        { id: 'valid', content: 'Valid note', position: [100, 200] },
        { content: 'Missing ID', position: [300, 400] }, // Invalid: no ID
        { id: 'nopos', content: 'Missing position' }, // Invalid: no position
        { id: 'badpos', content: 'Bad position', position: 'invalid' }, // Invalid: bad position
      ];

      const processedNotes =
        canonicalStorage.validateAndCleanNotes(invalidNotes);

      expect(processedNotes).toHaveLength(1); // Only valid note remains
      expect(processedNotes[0].id).toBe('valid');
    });

    it('should enforce position format as [x, y] numeric array', () => {
      const notes = [
        { id: 'note1', content: 'Test', position: [100, 200] },
        { id: 'note2', content: 'Test', position: ['300', '400'] }, // String numbers
        { id: 'note3', content: 'Test', position: { x: 500, y: 600 } }, // Object format
      ];

      const processedNotes = canonicalStorage.validateAndCleanNotes(notes);

      processedNotes.forEach((note) => {
        expect(Array.isArray(note.position)).toBe(true);
        expect(note.position).toHaveLength(2);
        expect(typeof note.position[0]).toBe('number');
        expect(typeof note.position[1]).toBe('number');
      });
    });
  });

  describe('Data Integrity Guardrails', () => {
    it('should prevent HTML from ever entering storage layer', () => {
      const htmlInputs = [
        '<div>Content</div>',
        '<script>alert(1)</script>',
        '&lt;div&gt;Encoded&lt;/div&gt;',
        'Mix <b>bold</b> text',
        '<p>Para</p><ul><li>List</li></ul>',
      ];

      htmlInputs.forEach((htmlContent) => {
        const notes = [
          { id: 'test', content: htmlContent, position: [100, 200] },
        ];
        const processedNotes = canonicalStorage.processNotesForStorage(notes);

        expect(processedNotes[0].content).not.toContain('<');
        expect(processedNotes[0].content).not.toContain('>');
        expect(processedNotes[0].content).not.toContain('&lt;');
        expect(processedNotes[0].content).not.toContain('&gt;');
      });
    });

    it('should enforce maximum content size limits', () => {
      const largeContent = 'a'.repeat(50000); // 50KB content
      const notes = [
        { id: 'large', content: largeContent, position: [100, 200] },
      ];

      const processedNotes = canonicalStorage.processNotesForStorage(notes);

      expect(processedNotes[0].content.length).toBeLessThanOrEqual(10000); // Truncated to 10KB
    });

    it('should sanitize dangerous URI schemes in note content', () => {
      const dangerousNotes = [
        {
          id: 'js',
          content: 'Click javascript:alert(1) here',
          position: [100, 200],
        },
        {
          id: 'data',
          content: 'Visit data:text/html,<script>bad</script>',
          position: [300, 400],
        },
        {
          id: 'vbs',
          content: 'Run vbscript:msgbox("bad")',
          position: [500, 600],
        },
      ];

      const processedNotes =
        canonicalStorage.processNotesForStorage(dangerousNotes);

      processedNotes.forEach((note) => {
        expect(note.content).not.toContain('javascript:');
        expect(note.content).not.toContain('data:text/html');
        expect(note.content).not.toContain('vbscript:');
      });
    });
  });

  describe('Export/Import Consistency', () => {
    it('should export only markdown content in all formats', () => {
      const notes = [
        {
          id: 'note1',
          content: '# Header\n**Bold** text',
          position: [100, 200],
        },
        { id: 'note2', content: '- Item 1\n- Item 2', position: [300, 400] },
      ];

      const jsonExport = canonicalStorage.exportToJson(notes);
      const csvExport = canonicalStorage.exportToCsv(notes);

      expect(jsonExport).not.toContain('<');
      expect(jsonExport).not.toContain('>');
      expect(csvExport).not.toContain('<');
      expect(csvExport).not.toContain('>');

      expect(jsonExport).toContain('# Header');
      expect(jsonExport).toContain('**Bold**');
      expect(csvExport).toContain('- Item 1');
    });

    it('should import and process content through defang pipeline', () => {
      const importedData = {
        notes: [
          {
            id: 'import1',
            content: '<h1>Title</h1><p>Content</p>',
            position: [100, 200],
          },
          { id: 'import2', content: '# Already clean', position: [300, 400] },
        ],
      };

      const processedData = canonicalStorage.processImportedData(importedData);

      expect(processedData.notes[0].content).toBe('Title Content');
      expect(processedData.notes[0].content).not.toContain('<h1>');
      expect(processedData.notes[0].content).not.toContain('<p>');

      expect(processedData.notes[1].content).toBe('# Already clean');
    });

    it('should maintain round-trip consistency for clean markdown content', () => {
      const originalNotes = [
        {
          id: 'note1',
          content: '# Header **Bold** and *italic* text - Item 1 - Item 2',
          position: [100, 200],
        },
      ];

      // Save to storage
      canonicalStorage.saveNotesToStorage(originalNotes);

      // Load from storage
      const loadedData = JSON.parse(mockLocalStorage.getItem('mindmeld-notes'));

      // Re-process loaded data
      const processedNotes = canonicalStorage.processNotesForStorage(
        loadedData.notes,
      );

      expect(processedNotes[0].content).toBe(originalNotes[0].content);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large numbers of notes efficiently', () => {
      const manyNotes = Array.from({ length: 1000 }, (_, i) => ({
        id: `note-${i}`,
        content: `# Note ${i}\nContent for note ${i}`,
        position: [i * 10, i * 10],
      }));

      const startTime = performance.now();
      const processedNotes = canonicalStorage.processNotesForStorage(manyNotes);
      const endTime = performance.now();

      expect(processedNotes).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
    });

    it('should batch process large storage operations', () => {
      const largeDataSet = Array.from({ length: 500 }, (_, i) => ({
        id: `note-${i}`,
        content: `Content ${i}`.repeat(100), // Reasonably sized content
        position: [i, i],
      }));

      const startTime = performance.now();
      canonicalStorage.saveNotesToStorage(largeDataSet);
      const endTime = performance.now();

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(2000); // Under 2 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const notes = [
        { id: 'test', content: 'Test content', position: [100, 200] },
      ];

      expect(() => {
        canonicalStorage.saveNotesToStorage(notes);
      }).not.toThrow();
    });

    it('should recover from corrupted storage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json data');

      const result = canonicalStorage.loadNotesFromStorage();

      expect(result).toEqual({ notes: [], recovered: false });
    });

    it('should validate and clean corrupted note data', () => {
      const corruptedNotes = [
        { id: 'good', content: 'Valid', position: [100, 200] },
        { id: null, content: 'Bad ID', position: [300, 400] },
        {
          id: 'bad-content',
          content: '<script>evil</script>',
          position: [500, 600],
        },
        'not an object',
        null,
        undefined,
      ];

      const cleanedNotes =
        canonicalStorage.validateAndCleanNotes(corruptedNotes);

      expect(cleanedNotes).toHaveLength(2); // Only valid notes remain
      expect(cleanedNotes[0].id).toBe('good');
      expect(cleanedNotes[1].id).toBe('bad-content');
      expect(cleanedNotes[1].content).not.toContain('<script>');
    });
  });
});
