# Playwright Setup and Usage for MindMeld

## Setup

1. Playwright has been installed and configured in this project. The main configuration file is `playwright.config.js` in the project root.

2. Tests are located in the `tests` directory.

## Running Tests

To run all tests:

```bash
npx playwright test
```

To run a specific test file:

```bash
npx playwright test tests/sample.spec.js
```

To run tests in headed mode (to see the browser):

```bash
npx playwright test --headed
```

To run tests in a specific browser:

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Viewing Test Results

After running tests, Playwright generates an HTML report. To view it:

```bash
npx playwright show-report
```

## Writing New Tests

1. Create a new file in the `tests` directory with a `.spec.js` extension.
2. Use the `test` and `expect` functions from Playwright to write your tests.
3. Follow the pattern in `sample.spec.js` for basic test structure.

## Debugging Tests

To debug a test:

1. Add the `debug()` method in your test where you want to pause:

   ```javascript
   await page.pause();
   ```

2. Run the test with the `--debug` flag:

   ```bash
   npx playwright test --debug
   ```

This will open a special browser window where you can step through your test.

## Continuous Integration

A GitHub Actions workflow has been set up to run these tests on every push. Check the `.github/workflows` directory for details.

For more information, refer to the [Playwright documentation](https://playwright.dev/docs/intro).
