import { CanvasModule } from '../src/js/core/canvasModule';

describe('CanvasModule', () => {
  let canvasModule;

  beforeEach(() => {
    canvasModule = new CanvasModule('Test Canvas', 800, 600, 'styles.css');
  });

  test('createBackgroundLayout should return a div element with correct styles', () => {
    const layout = canvasModule.createBackgroundLayout();

    expect(layout.tagName).toBe('DIV');
    expect(layout.classList.contains('background-layout')).toBe(true);
    expect(layout.style.width).toBe('800px');
    expect(layout.style.height).toBe('600px');
    expect(layout.style.position).toBe('absolute');
    expect(layout.style.left).toBe('50%');
    expect(layout.style.top).toBe('50%');
    expect(layout.style.transform).toBe('translate(-50%, -50%)');
  });

  test('loadCSS should return a style element with correct CSS text', async () => {
    const mockResponse = new Response('.test { color: red; }', { status: 200 });
    jest.spyOn(window, 'fetch').mockResolvedValue(mockResponse);

    const style = await canvasModule.loadCSS();

    expect(window.fetch).toHaveBeenCalledWith('styles.css');
    expect(style.tagName).toBe('STYLE');
    expect(style.textContent).toBe('.test { color: red; }');
    expect(style.id).toBe('style-test-canvas');
  });

  test('loadCSS should return null if cssPath is not provided', async () => {
    canvasModule = new CanvasModule('Test Canvas', 800, 600);

    const style = await canvasModule.loadCSS();

    expect(style).toBeNull();
  });

  test('loadCSS should handle failed CSS loading', async () => {
    const mockResponse = new Response(null, { status: 404 });
    jest.spyOn(window, 'fetch').mockResolvedValue(mockResponse);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const style = await canvasModule.loadCSS();

    expect(window.fetch).toHaveBeenCalledWith('styles.css');
    expect(style).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to load CSS for Test Canvas',
    );
  });
});
