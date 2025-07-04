# Contributing to MCP MAGMA Handbook

Thank you for your interest in contributing to the MCP MAGMA Handbook Server! This project aims to make MAGMA computational algebra resources more accessible through AI assistants.

## How to Contribute

### 🐛 Bug Reports

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)

### 💡 Feature Requests

We welcome suggestions for new features:
- Describe the feature and its use case
- Explain how it would benefit users
- Consider implementation complexity

### 🔧 Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** if applicable
5. **Update documentation** as needed
6. **Commit with clear messages**: `git commit -m "Add amazing feature"`
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Create a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/mcp-magma-handbook.git
cd mcp-magma-handbook

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Keep functions focused and small
- Use meaningful variable names

## Testing

- Write unit tests for new features
- Ensure all tests pass: `npm test`
- Test with real MAGMA handbook data
- Verify MCP compliance

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for API changes
- Update examples if syntax changes
- Consider adding to docs/ folder for complex features

## Areas Where We Need Help

### 🎯 High Priority
- **Performance optimization** for large PDFs
- **Additional document formats** (HTML, TeX)
- **Multi-language support** for international handbooks
- **Advanced MAGMA parsing** for better code recognition

### 🔧 Medium Priority
- **UI improvements** for configuration
- **Caching mechanisms** for faster responses
- **Error handling** improvements
- **Integration tests** with real MCP clients

### 📚 Documentation
- **Video tutorials** for setup
- **More usage examples**
- **Best practices guide**
- **API documentation**

## Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and resources
- Follow the code of conduct (coming soon)

## Questions?

- Open an issue for technical questions
- Email: baegjaehyeon@gmail.com
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make MAGMA more accessible to everyone!** 🧙‍♂️✨