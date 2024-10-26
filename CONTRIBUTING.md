# Contributing to JS-ECUtils

Thank you for your interest in contributing to the `js-ecutils` project, our toolkit for Elliptic Curve Cryptography in JavaScript. Your efforts are highly valued, and we aim to ensure a smooth contribution process. Please follow these guidelines to make a successful contribution.

## Setting Up Your Development Environment

To contribute, start by setting up your local development environment:

1. **Fork** the `js-ecutils` repository on GitHub.
2. **Clone** your fork to your local machine.
3. **Navigate** to the project directory:

   ```bash
   cd js-ecutils
   ```

4. **Install** the project’s dependencies:

   ```bash
   npm install
   ```

By working directly in the project directory, any changes you make will be reflected without additional setup.

## Making Changes and Using Prefixes

When you're ready to make changes:

1. **Create a branch** with a prefix indicating the type of changes:

   ```bash
   # Use one of the following prefixes: feature/, fix/, doc/, test/, refactor/, or style/
   git checkout -b feature/name-of-your-feature
   ```

2. Follow the coding conventions used throughout the project to maintain consistency.

## Writing and Running Tests

Testing is essential to ensure `js-ecutils` remains reliable:

1. Add new tests to the `tests` directory and ensure they're named to match the associated feature or fix.

2. Aim for high test coverage to maintain robustness:

   ```bash
   npm run coverage
   ```

Verify that your code passes all tests and maintains overall test coverage.

## Submitting Pull Requests (PRs)

To submit your changes:

1. Push your changes to your forked repository.
2. In the original `js-ecutils` repository, initiate a new pull request.
3. Choose the appropriate fork and branch.
4. **Title** your PR using the same prefix as your branch, followed by a concise description:

   ```plaintext
   Feature: Implement new elliptic curve model
   Fix: Resolve point addition edge case
   Doc: Update README with contribution guidelines
   Test: Add tests for point doubling
   Refactor: Refine internal structure for module X
   Style: Adjust code formatting for consistency
   ```

5. In the PR's description, explain your changes and reference any issues using the format `fixes #issue_number`.
6. Submit the pull request.

## Code Review and Integration

Project maintainers will review your PR, run additional tests, and may suggest improvements before merging. Please stay available to address any feedback or questions.

## Acknowledgment

Your contributions are invaluable to `js-ecutils`. Together, we can expand and improve this cryptographic toolkit. Let’s collaborate to take `js-ecutils` to new heights!
