# Contributing

We welcome contributions! Here's how you can help:

## Reporting Issues

If you find a bug or have a feature request:

1. Check if the issue already exists in our [Issues](https://github.com/asizikov-demos/copilot-user-level-statistics-viewer/issues)
2. If not, create a new issue with:
   - Clear description of the problem or feature request
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable

## Contributing Code

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/copilot-user-level-statistics-viewer.git
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our code quality guidelines:
   - No unused variables (`@typescript-eslint/no-unused-vars`)
   - No explicit `any` types (`@typescript-eslint/no-explicit-any`)
   - Use proper TypeScript types
   - Run `npm run build` before committing
5. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** from your fork to the main repository

## Code Quality

- Follow the existing code style and patterns
- Add TypeScript types for all new code
- Test your changes locally with `npm run build`
- Update documentation if needed
