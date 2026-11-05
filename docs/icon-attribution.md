# Icon conventions and attribution

## Shared interface contract

The statistics and billing viewers use named `@primer/octicons-react` components
for interface icons. Use native **16px** icons for navigation, inline/table
controls, search, copy, pagination, sorting and disclosure. Use **24px** for
prominent metric, status and upload visuals, empty states, and the header GitHub
mark. Native 12px is reserved for genuinely supported condensed contexts.
Do not override native dimensions with CSS; keep control hit areas independent
of icon size. Icons supplement labels and are decorative (`aria-hidden` or an
empty image `alt`); icon-only controls must have accessible names.

| Category | Primer icon |
| --- | --- |
| Overview | `HomeIcon` |
| Users | `PeopleIcon` |
| Models / model usage | `AiModelIcon` |
| Agent-specific adoption | `AgentIcon` |
| Insights | `LightBulbIcon` |
| AI Credits / financial AI Usage | `CreditCardIcon` |
| Organizations | `OrganizationIcon` |
| Cost Centers | `BriefcaseIcon` |

Use these mappings wherever the category exists; generic Copilot adoption keeps
`CopilotIcon`, not `AgentIcon`. Shared actions use `UploadIcon`, `LockIcon`,
`CopyIcon`, `SearchIcon`, `ChevronLeftIcon`, `ChevronRightIcon`,
`ChevronDownIcon`, `AlertIcon` for warnings, `XCircleFillIcon` for errors, and
`XIcon` for close. Sorting uses `SortIndicator`: `ArrowSwitchIcon` when inactive
and `TriangleUpIcon` / `TriangleDownIcon` when active.

Client and model registries accept `size={16 | 24}`, defaulting to 16px for
compact rows and legends; prominent contexts pass 24px. Unknown models use
`AiModelIcon`; unknown clients use `TerminalIcon`.

**Exceptions:** recognizable third-party IDE and vendor marks retain their
original brand geometry, aspect ratio and colors at the same 16px/24px sizes.
GitHub and Copilot geometry comes from the package, including the deliberate
purple CLI Copilot and black GitHub model marks. Chart SVGs, sparklines and
visualization geometry are not interface icons and retain their own sizing.
Primer-managed controls retain package-owned visuals: in particular, critical
`Banner` uses `StopIcon` and does not support a custom leading visual. Keep that
critical variant rather than changing alert semantics or overriding package CSS.

## Client icon attribution

The Azure DevOps SVG and blue (`#0078D7`) are from
[Simple Icons 11.0.0](https://github.com/simple-icons/simple-icons/blob/11.0.0/icons/azuredevops.svg),
under [CC0 1.0 Universal](https://github.com/simple-icons/simple-icons/blob/11.0.0/LICENSE.md).

The OpenCode, Claude Code, and Codex SVG paths in
`src/components/icons/IDEIcons.tsx` are adapted from
[LobeHub Icons](https://github.com/lobehub/lobe-icons), licensed under MIT:

- [OpenCode](https://github.com/lobehub/lobe-icons/blob/master/src/OpenCode/components/Mono.tsx)
- [Claude Code](https://github.com/lobehub/lobe-icons/blob/master/src/ClaudeCode/components/Mono.tsx)
- [Codex](https://github.com/lobehub/lobe-icons/blob/master/src/Codex/components/Mono.tsx)

GitHub and Copilot client icons use `@primer/octicons-react` (MIT).
The Slack SVG paths are from
[Simple Icons 13.21.0](https://github.com/simple-icons/simple-icons/blob/13.21.0/icons/slack.svg),
under [CC0 1.0 Universal](https://github.com/simple-icons/simple-icons/blob/13.21.0/LICENSE.md).
The mark uses Slack's red (`#E01E5A`), blue (`#36C5F0`), green (`#2EB67D`),
and yellow (`#ECB22E`) brand colors.
Copilot branding covers App, SDK, and Cloud Agent.
Agentic Workflows uses Primer's `WorkflowIcon` (`workflow-16`).
Copilot Code Review uses Primer's `CodeReviewIcon` (`code-review-16`).
GitHub Desktop and Mobile use Primer's `DeviceDesktopIcon` (`device-desktop-16`)
and `DeviceMobileIcon` (`device-mobile-16`); GitHub Web retains the GitHub mark.
Brand marks identify the reported client; they do not imply endorsement.
Claude Code uses LobeHub's terracotta (`#D97757`); Codex uses its
lavender-to-blue gradient (`#B1A7FF`, `#7A9DFF`, `#3941FF`) on the compact mark.

## LobeHub Icons license

MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
