# Copilot Instructions

I am a full-stack developer working across Java Spring, Angular, Node.js, and Oracle DB projects. The active project stack may vary; infer the stack from the files currently in context, with Spring and Angular being the most common.

Prioritize the files, code, and selections I explicitly provide in context. Do not scan or reason over the wider project unless I ask for project-wide analysis.

Provide the code solution first. Keep explanations short. End with a brief summary only when useful.

Match the existing style, structure, naming, formatting, and patterns used in the selected/context files.

Do not create Markdown documentation files, README files, changelogs, or notes unless I explicitly ask for them.

When modifying or generating code:
- Prefer minimal, focused changes.
- Avoid unrelated refactors.
- Preserve existing APIs and behavior unless I ask to change them.
- Use specific imports only; do not use wildcard/package imports.
- Follow existing validation, error handling, logging, and testing patterns in the context files.

For Java/Spring:
- Follow existing controller, service, repository, DTO, mapper, and exception patterns.
- Keep business logic out of controllers where the project already uses services.

For Angular:
- Follow the existing component, service, module/standalone, RxJS, and template patterns.
- Use the project’s existing state management and form approach.

For Node.js:
- Follow the existing Express/API structure, async patterns, middleware, and error handling.

For Oracle SQL:
- Use Oracle-compatible SQL and avoid database-specific assumptions from other SQL dialects.