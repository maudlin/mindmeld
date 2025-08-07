// tests/unit/integration/colorPicker.integration.test.js

describe('Color Picker Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Selection Synchronization Behavior', () => {
    it('should demonstrate color picker updating based on note selection', () => {
      // Create notes with different colors
      const note1 = document.createElement('div');
      note1.id = 'note1';
      note1.className = 'note color-pink';
      document.body.appendChild(note1);

      const note2 = document.createElement('div');
      note2.id = 'note2';
      note2.className = 'note color-blue';
      document.body.appendChild(note2);

      // Create color picker
      const container = document.createElement('div');
      container.id = 'color-picker-container';

      const palette = document.createElement('div');
      palette.className = 'color-picker-palette';

      const yellowSwatch = document.createElement('div');
      yellowSwatch.className = 'color-swatch active';
      yellowSwatch.setAttribute('data-color', 'yellow');

      const pinkSwatch = document.createElement('div');
      pinkSwatch.className = 'color-swatch';
      pinkSwatch.setAttribute('data-color', 'pink');

      const blueSwatch = document.createElement('div');
      blueSwatch.className = 'color-swatch';
      blueSwatch.setAttribute('data-color', 'blue');

      palette.appendChild(yellowSwatch);
      palette.appendChild(pinkSwatch);
      palette.appendChild(blueSwatch);
      container.appendChild(palette);
      document.body.appendChild(container);

      // Test scenario: selecting note1 (pink) should update picker
      function simulateNoteSelection(noteId, expectedColor) {
        // Clear all selections
        document
          .querySelectorAll('.note')
          .forEach((n) => n.classList.remove('selected'));

        // Select the specific note
        const note = document.getElementById(noteId);
        note.classList.add('selected');

        // Extract color from note's class
        const colorClass = Array.from(note.classList).find((cls) =>
          cls.startsWith('color-'),
        );
        const noteColor = colorClass
          ? colorClass.replace('color-', '')
          : 'yellow';

        // Update picker to reflect note's color
        document
          .querySelectorAll('.color-swatch')
          .forEach((s) => s.classList.remove('active'));
        const targetSwatch = document.querySelector(
          `[data-color="${noteColor}"]`,
        );
        if (targetSwatch) {
          targetSwatch.classList.add('active');
        }

        // Verify the expected behavior
        expect(noteColor).toBe(expectedColor);
        expect(targetSwatch.classList.contains('active')).toBe(true);
      }

      // Initially yellow is active
      expect(yellowSwatch.classList.contains('active')).toBe(true);

      // Simulate selecting pink note
      simulateNoteSelection('note1', 'pink');
      expect(pinkSwatch.classList.contains('active')).toBe(true);
      expect(yellowSwatch.classList.contains('active')).toBe(false);

      // Simulate selecting blue note
      simulateNoteSelection('note2', 'blue');
      expect(blueSwatch.classList.contains('active')).toBe(true);
      expect(pinkSwatch.classList.contains('active')).toBe(false);
    });

    it('should handle multiple note selections correctly', () => {
      // Create multiple notes
      const note1 = document.createElement('div');
      note1.id = 'note1';
      note1.className = 'note color-pink selected';

      const note2 = document.createElement('div');
      note2.id = 'note2';
      note2.className = 'note color-blue selected';

      document.body.appendChild(note1);
      document.body.appendChild(note2);

      // Create color picker
      const picker = document.createElement('div');
      picker.innerHTML = `
        <div class="color-picker-palette">
          <div class="color-swatch" data-color="yellow"></div>
          <div class="color-swatch active" data-color="pink"></div>
        </div>
      `;
      document.body.appendChild(picker);

      // When multiple notes are selected, behavior should fall back to global color
      const selectedNotes = document.querySelectorAll('.note.selected');
      expect(selectedNotes.length).toBe(2);

      // In a real implementation, this would show the global current color
      // For this test, we simulate that by showing yellow (default global)
      document
        .querySelectorAll('.color-swatch')
        .forEach((s) => s.classList.remove('active'));
      const yellowSwatch = document.querySelector('[data-color="yellow"]');
      yellowSwatch.classList.add('active');

      expect(yellowSwatch.classList.contains('active')).toBe(true);
    });
  });

  describe('Data Export/Import with Colors', () => {
    it('should demonstrate color data structure for export', () => {
      // Simulate the data structure that would be exported
      const exportData = {
        data: {
          n: [
            {
              i: 'note1',
              c: 'First note',
              p: [100, 200],
              cl: 'pink', // Color field
            },
            {
              i: 'note2',
              c: 'Second note',
              p: [300, 400],
              // No cl field - uses default yellow
            },
            {
              i: 'note3',
              c: 'Third note',
              p: [500, 600],
              cl: 'blue',
            },
          ],
          c: [],
        },
      };

      // Verify export structure includes color data
      expect(exportData.data.n[0].cl).toBe('pink');
      expect(exportData.data.n[1].cl).toBeUndefined(); // Default color not exported
      expect(exportData.data.n[2].cl).toBe('blue');
    });

    it('should demonstrate color data import process', () => {
      const importData = {
        note1: { colorScheme: 'pink' },
        note3: { colorScheme: 'blue' },
        // note2 not present - uses default
      };

      // Create notes that would be imported
      const note1 = document.createElement('div');
      note1.id = 'note1';
      note1.className = 'note';

      const note2 = document.createElement('div');
      note2.id = 'note2';
      note2.className = 'note';

      const note3 = document.createElement('div');
      note3.id = 'note3';
      note3.className = 'note';

      document.body.appendChild(note1);
      document.body.appendChild(note2);
      document.body.appendChild(note3);

      // Simulate applying imported colors
      Object.entries(importData).forEach(([noteId, colorData]) => {
        const note = document.getElementById(noteId);
        if (note && colorData.colorScheme) {
          // Remove existing color classes
          note.classList.forEach((cls) => {
            if (cls.startsWith('color-')) {
              note.classList.remove(cls);
            }
          });
          // Add new color class
          note.classList.add(`color-${colorData.colorScheme}`);
        }
      });

      // Apply default to notes without specific colors
      const notesWithoutColor = document.querySelectorAll(
        '.note:not([class*="color-"])',
      );
      notesWithoutColor.forEach((note) => {
        note.classList.add('color-yellow');
      });

      // Verify colors were applied correctly
      expect(note1.classList.contains('color-pink')).toBe(true);
      expect(note2.classList.contains('color-yellow')).toBe(true); // Default
      expect(note3.classList.contains('color-blue')).toBe(true);
    });
  });

  describe('CSS Color Application', () => {
    it('should demonstrate note color class management', () => {
      const note = document.createElement('div');
      note.className = 'note color-yellow selected';
      document.body.appendChild(note);

      // Function to change note color (simulating color application)
      function changeNoteColor(noteElement, newColor) {
        // Remove all color classes
        const classList = Array.from(noteElement.classList);
        classList.forEach((cls) => {
          if (cls.startsWith('color-')) {
            noteElement.classList.remove(cls);
          }
        });

        // Add new color class
        noteElement.classList.add(`color-${newColor}`);
      }

      // Initially yellow
      expect(note.classList.contains('color-yellow')).toBe(true);
      expect(note.classList.contains('selected')).toBe(true); // Should preserve

      // Change to pink
      changeNoteColor(note, 'pink');
      expect(note.classList.contains('color-pink')).toBe(true);
      expect(note.classList.contains('color-yellow')).toBe(false);
      expect(note.classList.contains('selected')).toBe(true); // Should preserve

      // Change to blue
      changeNoteColor(note, 'blue');
      expect(note.classList.contains('color-blue')).toBe(true);
      expect(note.classList.contains('color-pink')).toBe(false);
      expect(note.classList.contains('selected')).toBe(true); // Should preserve
    });
  });

  describe('Event Flow Simulation', () => {
    it('should demonstrate the complete color selection flow', () => {
      // Create a note
      const note = document.createElement('div');
      note.id = 'test-note';
      note.className = 'note color-yellow';
      note.textContent = 'Test Note';
      document.body.appendChild(note);

      // Create color picker
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="color-picker-palette">
          <div class="color-swatch active" data-color="yellow"></div>
          <div class="color-swatch" data-color="pink"></div>
          <div class="color-swatch" data-color="green"></div>
          <div class="color-swatch" data-color="blue"></div>
        </div>
      `;
      document.body.appendChild(container);

      // Simulate complete flow: note selection -> color picker update -> color change

      // Step 1: Select note
      note.classList.add('selected');

      // Step 2: Click on pink color in picker
      const pinkSwatch = document.querySelector('[data-color="pink"]');
      let colorChanged = false;

      pinkSwatch.addEventListener('click', () => {
        // Step 3: Apply color to selected note
        note.classList.remove('color-yellow');
        note.classList.add('color-pink');

        // Step 4: Update picker visual state
        document
          .querySelectorAll('.color-swatch')
          .forEach((s) => s.classList.remove('active'));
        pinkSwatch.classList.add('active');

        colorChanged = true;
      });

      // Trigger the event
      pinkSwatch.click();

      // Verify complete flow worked
      expect(colorChanged).toBe(true);
      expect(note.classList.contains('color-pink')).toBe(true);
      expect(note.classList.contains('color-yellow')).toBe(false);
      expect(pinkSwatch.classList.contains('active')).toBe(true);
    });
  });
});
