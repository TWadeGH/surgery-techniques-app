SECURITY_CHECKLIST.md
Mandatory: This document is the primary security gate for all AI-assisted coding tasks. No task is considered "complete" until every checkmark in this list is addressed.
🛡️ Phase 1: Security TDD (Pre-Implementation)
Before writing functional code, the agent must generate a security-first plan:
[ ] Threat Model: Identify the 10 most dangerous vulnerabilities this specific feature could introduce (e.g., SSRF, BOLA, XSS).
[ ] "Break-it" Tests: Write a test suite designed specifically to trigger those 10 vulnerabilities.
[ ] Edge Case Fuzzing: Define 50 edge cases (nulls, Unicode, 100k+ item arrays, negative numbers) to be used for automated testing.
🕵️ Phase 2: Mandatory Knowledge Audit
During code generation, ensure these domain-specific standards are met:
1. Input & Data Integrity
[ ] Validation: Sanitize all user inputs (SQLi, XSS, Command Injection) using allowlists and type-checking.
[ ] Path Traversal: Ensure file system operations cannot be manipulated via ../ patterns.
[ ] PII & Privacy: Mask or encrypt Personally Identifiable Information (PII). No sensitive data in logs or comments.
2. Access & Identity
[ ] Auth Enforcement: Verify permissions (RBAC) on the server-side before every sensitive operation.
[ ] Secrets: Zero hardcoded credentials. Use environment variables or secret managers (e.g., .env, Vault).
[ ] Least Privilege: Ensure the code runs with the minimum permissions necessary.
3. Supply Chain & Dependencies
[ ] Phantom Dependencies: Verify that all suggested packages are real and not "hallucinated" slopsquatting targets.
[ ] Version Pinning: Use strict versions in requirements.txt or package.json to prevent malicious updates.
🚀 Phase 3: The Automated Scanner Stack
Run these commands and resolve all errors before opening a Pull Request:
Tool
Focus
Command
Semgrep
OWASP Top 10
semgrep scan --config=auto
Gitleaks
Secret Detection
gitleaks detect --verbose
Snyk / SCA
Dependency CVEs
snyk test
Bandit
Python Security
bandit -r .
Ruff / Mypy
Type & Logic
ruff check . / mypy . --strict

🛑 Phase 4: Final Verification (The "Snitch" Test)
[ ] Internal Critique: Agent, identify exactly where you took shortcuts or where the logic is most fragile.
[ ] 100% Pass Rate: All unit tests and "Break-it" tests must pass.
[ ] Pre-commit Lock: Confirm that .pre-commit-config.yaml is active and blocking the commit.
