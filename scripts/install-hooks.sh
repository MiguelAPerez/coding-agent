#!/bin/bash

PRE_COMMIT_HOOK=".git/hooks/pre-commit"
echo "Installing native pre-commit hook..."

cat <<HOOK_EOF > "$PRE_COMMIT_HOOK"
#!/bin/bash
echo "Running pre-commit checks..."
npm run lint
LINT_EXIT=\$?
npx tsc --noEmit
TYPE_EXIT=\$?

if [ \$LINT_EXIT -ne 0 ] || [ \$TYPE_EXIT -ne 0 ]; then
  echo "❌ Pre-commit checks failed."
  exit 1
fi
echo "✅ Pre-commit checks passed."
HOOK_EOF

chmod +x "$PRE_COMMIT_HOOK"
echo "✅ Native git hook installed successfully."
