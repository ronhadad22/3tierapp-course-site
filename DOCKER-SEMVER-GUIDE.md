# Docker Build with Semantic Versioning Guide

This repository uses **semantic-release** for automated version management and Docker image tagging following best practices.

## What is Semantic Versioning?

Semantic versioning (SemVer) uses a three-part version number: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (1.0.0 → 1.0.1)

## How It Works

### 1. Conventional Commits

Your commit messages determine the version bump:

```bash
# Patch release (1.0.0 → 1.0.1)
git commit -m "fix: resolve login bug"

# Minor release (1.0.0 → 1.1.0)
git commit -m "feat: add user profile page"

# Major release (1.0.0 → 2.0.0)
git commit -m "feat: redesign API

BREAKING CHANGE: API endpoints have changed"
```

### 2. Automated Workflow

When you push to `main`:

1. **Semantic Release** analyzes commits
2. Determines version bump (if needed)
3. Creates GitHub release with changelog
4. **Docker Build** triggered automatically
5. Image tagged with multiple versions
6. Pushed to Amazon ECR

### 3. Docker Image Tags

Each release creates multiple tags:

```
950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1.2.3  # Full version
950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1.2    # Major.Minor
950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1      # Major
950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:latest # Latest
```

## Conventional Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor (1.0.0 → 1.1.0) |
| `fix` | Bug fix | Patch (1.0.0 → 1.0.1) |
| `docs` | Documentation | None |
| `style` | Code style (formatting) | None |
| `refactor` | Code refactoring | None |
| `perf` | Performance improvement | Patch |
| `test` | Add/update tests | None |
| `chore` | Maintenance tasks | None |
| `ci` | CI/CD changes | None |

### Breaking Changes

Add `BREAKING CHANGE:` in the footer to trigger a major version bump:

```bash
git commit -m "feat: new authentication system

BREAKING CHANGE: Old auth tokens are no longer valid"
```

## Examples

### Example 1: Bug Fix

```bash
git add .
git commit -m "fix: resolve memory leak in server"
git push origin main
```

**Result**: 
- Version: 1.0.0 → 1.0.1
- Tags: `1.0.1`, `1.0`, `1`, `latest`

### Example 2: New Feature

```bash
git add .
git commit -m "feat: add user authentication"
git push origin main
```

**Result**:
- Version: 1.0.1 → 1.1.0
- Tags: `1.1.0`, `1.1`, `1`, `latest`

### Example 3: Breaking Change

```bash
git add .
git commit -m "feat: redesign API endpoints

BREAKING CHANGE: All API endpoints now use /v2/ prefix"
git push origin main
```

**Result**:
- Version: 1.1.0 → 2.0.0
- Tags: `2.0.0`, `2.0`, `2`, `latest`

### Example 4: Multiple Changes

```bash
git add .
git commit -m "feat: add dashboard
feat: add analytics
fix: resolve login issue"
git push origin main
```

**Result**:
- Version: 1.0.0 → 1.1.0 (highest bump wins)
- Tags: `1.1.0`, `1.1`, `1`, `latest`

## Workflow Files

### `.github/workflows/docker-build-release.yml`

Main workflow with three jobs:

1. **semantic-release**: Analyzes commits and creates release
2. **docker-build**: Builds and pushes Docker image
3. **summary**: Prints deployment summary

### `.releaserc.json`

Semantic-release configuration:
- Analyzes commits
- Generates changelog
- Creates GitHub releases
- Updates version files

## Docker Image Usage

### Pull Specific Version

```bash
# Pull exact version
docker pull 950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1.2.3

# Pull minor version (gets latest patch)
docker pull 950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1.2

# Pull major version (gets latest minor)
docker pull 950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1

# Pull latest
docker pull 950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:latest
```

### Run Container

```bash
docker run -p 3000:3000 \
  950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1.2.3
```

## Best Practices

### 1. Use Conventional Commits

Always follow the conventional commit format. This ensures proper versioning.

### 2. Write Descriptive Commit Messages

```bash
# Good
git commit -m "feat: add user profile page with avatar upload"

# Bad
git commit -m "update stuff"
```

### 3. Use Scopes for Organization

```bash
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(api): resolve timeout issue"
git commit -m "docs(readme): update installation steps"
```

### 4. Pin Versions in Production

```bash
# Production - use specific version
image: 950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:1.2.3

# Development - use latest
image: 950555670656.dkr.ecr.us-east-2.amazonaws.com/3tierapp-course-site:latest
```

### 5. Review Changelog

After each release, check the generated `CHANGELOG.md` to ensure proper versioning.

## Troubleshooting

### No Release Created

**Problem**: Pushed commits but no release was created.

**Solution**: Ensure commits follow conventional format:
```bash
# This won't trigger a release
git commit -m "updated code"

# This will trigger a release
git commit -m "fix: updated authentication logic"
```

### Wrong Version Bump

**Problem**: Expected minor bump but got patch.

**Solution**: Use `feat:` for new features, not `fix:`:
```bash
# Patch bump
git commit -m "fix: add new feature"

# Minor bump (correct)
git commit -m "feat: add new feature"
```

### Docker Build Failed

**Problem**: Docker build fails in workflow.

**Solution**: 
1. Check Dockerfile syntax
2. Ensure all files exist
3. Verify ECR permissions
4. Check CodeBuild logs

## Monitoring

### Check Releases

GitHub Releases: https://github.com/ronhadad22/3tierapp-course-site/releases

### Check Docker Images

```bash
# List images in ECR
aws ecr describe-images \
  --repository-name 3tierapp-course-site \
  --region us-east-2 \
  --profile int-profile
```

### Check Workflow Runs

GitHub Actions: https://github.com/ronhadad22/3tierapp-course-site/actions

### Check CodeBuild

CodeBuild Console: https://console.aws.amazon.com/codesuite/codebuild/projects/test-github/history?region=us-east-2

## Version History

Versions are tracked in:
- `CHANGELOG.md` - Detailed changelog
- GitHub Releases - Release notes
- ECR Image Tags - Docker images

## Initial Release

To create your first release:

```bash
git add .
git commit -m "feat: initial release"
git push origin main
```

This will create version `1.0.0`.

## Summary

**Benefits of This Setup**:
- ✅ Automated versioning (no manual version bumps)
- ✅ Consistent version numbers across releases
- ✅ Automatic changelog generation
- ✅ Multiple Docker tags for flexibility
- ✅ GitHub releases with notes
- ✅ Best practice compliance
- ✅ Clear version history

**Workflow**:
1. Write code
2. Commit with conventional format
3. Push to main
4. Automated release + Docker build
5. Image available in ECR with semantic version tags

That's it! The system handles everything else automatically.
