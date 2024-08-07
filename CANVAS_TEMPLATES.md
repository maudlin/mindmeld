## Implementing New Canvas Template Modules

To add a new canvas template to MindMeld, follow these steps:

### 1. Create the Module Files

Create a new directory for your module in `js/features/canvas/templates/[your-module-name]/`. In this directory, create two files:

- `[yourModuleName]Canvas.js`: The main module file
- `[yourModuleName]Canvas.css`: The CSS styles for your module

### 2. Implement the Canvas Module

In your `[yourModuleName]Canvas.js` file:

```javascript
import { CanvasModule } from '../../../../core/canvasModule.js';

class YourModuleNameCanvas extends CanvasModule {
  constructor() {
    super(
      'Your Module Name',
      width,
      height,
      './js/features/canvas/templates/[yourModuleName]/[yourModuleName]Canvas.css',
    );
  }

  createBackgroundLayout() {
    const layout = super.createBackgroundLayout();
    layout.classList.add('your-module-name');

    // Add your custom layout elements here
    // For example:
    // const element = document.createElement('div');
    // element.className = 'custom-element';
    // layout.appendChild(element);

    return layout;
  }
}

export default YourModuleNameCanvas;
```

Replace `width` and `height` with the desired dimensions for your canvas.

### 3. Add CSS Styles

In your `[yourModuleName]Canvas.css` file, add the styles for your canvas layout:

```css
.background-layout.your-module-name {
  /* Add your custom styles here */
}

/* Add more specific styles as needed */
```

### 4. Register the New Module

Update the `config.js` file to include your new module:

```javascript
export default {
  // ... other config options ...
  canvasTypes: {
    // ... existing canvas types ...
    yourModuleName: {
      name: 'Your Module Name',
      path: '../features/canvas/templates/[your-module-name]/[yourModuleName]Canvas.js',
    },
  },
};
```

### 5. Best Practices and Considerations

- Ensure your module name is unique and descriptive.
- Keep your CSS scoped to your module to avoid conflicts with other styles.
- Use semantic HTML elements in your `createBackgroundLayout` method.
- Consider the impact of your layout on existing notes and connections.
- Test your module thoroughly with different zoom levels and canvas sizes.
- Document any specific interactions or features unique to your module.
- Files should be camel case (eg nowNextFuture) and suffix 'canvas', eg nowNextFutureCanvas.js or .css (this helps identify different files)
- Coloured backgrounds should be no more than 50% transparent so we can see the grid from beneath
- Design for containers (eg columns, boxes), that are no smaller than one box width (150px) and 20px padding on each side. Containers should aim for a border radius of c. 20px for consistency
- Headings in containers should indicate the purpose of the box, and should be in an H3, added as a heading, eg `const heading = document.createElement('h3'); heading.textContent = content`

### 6. Testing Your New Module

After implementing your module:

1. Rebuild and restart the application.
2. Use the canvas style dropdown to select your new module.
3. Verify that the layout renders correctly and CSS styles are applied.
4. Test interactions with notes and connections within your new layout.

By following these steps, you can create and integrate new canvas template modules into the MindMeld application, extending its functionality with custom layouts and designs.
