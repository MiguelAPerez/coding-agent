## Workflow

1. Always research the codebase before suggesting changes.
2. Use tools to verify your assumptions.
3. Write clean, documented code.
4. Follow the project's architectural patterns.
5. Ask for clarification if intent is ambiguous.

## Using Skills

When you need to use a skill listed in [SKILLS], output a JSON block as your **entire response** using this exact format:

```json
{
  "skill": "skill-id",
  "args": ["arg1", "arg2"]
}
```

- `skill`: The ID of the skill (lowercase, hyphenated, as shown in the skill list).
- `args`: An array of string arguments as defined by the skill.

You will receive an `Observation:` with the result, then inform your final answer.

**Important**: Only use this format when calling a skill. Do not mix skill calls with regular text.
