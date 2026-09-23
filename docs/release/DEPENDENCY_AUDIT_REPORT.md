# EVARO Dependency Security Audit Matrix — S1 Gate Report

**Date:** 2026-09-21  
**Author:** Gemini (Astra Core Preparation)  
**Scope:** 57 locked dependency vulnerabilities (43 High, 14 Moderate, 0 Critical)  
**Governance Policy:** EVARO Security Guardrails — Release Gate strictly BLOCKED in CI via `pnpm audit --audit-level=high`. Private Test Preview gated via `scripts/security/preview-security-gate.cjs` with verified 0 client bundle reachability.

---

## Executive Summary

- **Total Findings:** 57 (43 High, 14 Moderate, 0 Critical)
- **Client Runtime Reachability:** **0** (All 43 High findings are strictly inside build-time tools, compiler plugins, test frameworks, or CLI utilities).
- **Client Bundle Artifact Verification:** `apps/mobile/dist` inspected. None of `@xmldom/xmldom`, `image-size`, `js-yaml`, `shell-quote`, `form-data`, `vite`, `browserslist`, or `brace-expansion` are exported to the client.
- **Preview Gate Status:** `VERIFIED_NON_RELEASE` (Web bundle exported for private Safari/LAN evaluation with synthetic data).
- **Release / Store Submission Gate:** `BLOCKED` (Strictly requires upstream patches / Expo SDK upgrade / Astra resolution).

---

## High Severity Vulnerabilities Breakdown (43 Findings)

| Package | Severity | Current Version | Fixed Version | Primary Dependency Chain | Role | Reachability | Exploit Precondition | Status / Triage |
|---|---|---|---|---|---|---|---|---|
| `@xmldom/xmldom` (18 advisories) | HIGH | `0.8.13`, `0.9.10` | `>=0.8.15`, `>=0.9.12` | `expo>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` | Build Tool (iOS Plist generator) | Build time only | Malicious raw XML input during iOS project config generation | `EXPO_UPGRADE_DEPENDENT` / `TRANSITIVE_BUILD_ONLY` |
| `image-size` (2 advisories) | HIGH | `1.2.1` | `>=2.0.3` | `metro>image-size` | Bundler (asset dimension parser) | Build time only | Malicious JXL/HEIF image parsed by Metro during local build | `TRANSITIVE_BUILD_ONLY` (Upgrading to v2 breaks Metro 0.83 sync API) |
| `js-yaml` (4 advisories) | HIGH | `3.14.2`, `4.1.1` | `>=3.15.2`, `>=4.3.2` | `react-native>babel-jest>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml` & `eslint>@eslint/eslintrc>js-yaml` | Test Coverage / Linter | Dev/Test only | Malicious deeply nested YAML merge keys during lint/test execution | `TRANSITIVE_BUILD_ONLY` |
| `shell-quote` (1 advisory) | HIGH | `1.8.4` | `>=1.8.5` | `react-native>react-devtools-core>shell-quote` | Dev Tool (DevTools Core) | Dev only | Untrusted shell arguments passed into devtools | `SAFE_PATCH_CANDIDATE` / `TRANSITIVE_BUILD_ONLY` |
| `postcss` (2 advisories) | HIGH | `8.4.49`, `8.5.15` | `>=8.5.18` | `@expo/metro-config>postcss` | Bundler CSS parser | Build time only | Attacker-controlled sourceMappingURL in CSS comment during metro build | `TRANSITIVE_BUILD_ONLY` |
| `browserslist` (2 advisories) | HIGH | `4.28.2` | `>=4.28.7` | `metro>@babel/core>@babel/helper-compilation-targets>browserslist` | Build Tool (Babel targets) | Build time only | Malicious browserslist-stats.json file in repository | `TRANSITIVE_BUILD_ONLY` |
| `brace-expansion` (1 advisory) | HIGH | `2.0.1` | `>=2.1.2` | `@expo/cli>minimatch>brace-expansion` | Build CLI | Build time only | Exponential brace expansion in minimatch pattern | `TRANSITIVE_BUILD_ONLY` |
| `form-data` (1 advisory) | HIGH | `4.0.0` | `>=4.0.6` | `jest-expo>jest-environment-jsdom>jsdom>form-data` | Test Environment | Test only | CRLF injection in mocked test form uploads | `TRANSITIVE_BUILD_ONLY` |
| `vite` (12 advisories) | HIGH | `8.0.0` | `>=8.0.16` | `packages/domain>vitest>@vitest/mocker>vite` | Test Runner (Domain unit tests) | Test only | Windows alternate path traversal in local test server | `TRANSITIVE_BUILD_ONLY` |

---

## Moderate Severity Vulnerabilities Breakdown (14 Findings)

| Package | Severity | Current Version | Fixed Version | Primary Dependency Chain | Role | Reachability | Status / Triage |
|---|---|---|---|---|---|---|---|
| `uuid` | MODERATE | `9.0.1` | `>=9.0.2` | Transitive dev dependency | Dev Tool | Dev only | `TRANSITIVE_BUILD_ONLY` |
| `decode-uri-component` | MODERATE | `0.2.2` | `>=0.2.3` | Transitive bundler dependency | Build Tool | Build time only | `TRANSITIVE_BUILD_ONLY` |
| `baseline-browser-mapping` | MODERATE | `2.10.33` | `>=2.11.0` | `browserslist>baseline-browser-mapping` | Build Tool | Build time only | `TRANSITIVE_BUILD_ONLY` |
| `@vitest/mocker` / `vitest` | MODERATE | `3.0.0` | `>=3.0.5` | `packages/domain>vitest` | Test Runner | Test only | `TRANSITIVE_BUILD_ONLY` |
| `@xmldom/xmldom` | MODERATE | `0.8.13`, `0.9.10` | `>=0.8.15` | `xcode>simple-plist>plist>@xmldom/xmldom` | Build Tool | Build time only | `TRANSITIVE_BUILD_ONLY` |

---

## Dual-Gate Architecture

```
                       +-------------------------------+
                       | Git Push / PR (All Branches)  |
                       +---------------+---------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
       +----------------------------+     +-------------------------------+
       |   GitHub Actions CI        |     |   Vercel Private Test Preview |
       +----------------------------+     +-------------------------------+
       | 1. pnpm install --frozen   |     | 1. pnpm verify (Type/Lint/Test|
       | 2. pnpm typecheck          |     | 2. preview-security-gate.cjs: |
       | 3. pnpm lint               |     |    - Zero Critical asserted   |
       | 4. pnpm test               |     |    - No prod secrets asserted |
       | 5. pnpm build (bundle scan)|     |    - 0 client reachability ok |
       | 6. pnpm audit --audit-level|     | 3. pnpm build (web export)    |
       |    high [BLOCKING GATE]    |     |                               |
       +----------------------------+     +-------------------------------+
                     |                                   |
                     v                                   v
             [RELEASE BLOCKED]                   [PREVIEW ACCESSIBLE]
         (Store/Prod publish blocked)        (Private Safari LAN/URL test)
```

---

## Action Plan for Astra Takeover

1. **Keep Release Gate Blocked:** Do not merge to `main` until upstream Expo SDK updates release clean plist/xmldom and Metro updates image-size.
2. **Track Expo 54 -> 55 Roadmap:** Upstream Expo team is updating `@expo/config-plugins` and `@expo/plist` to eliminate `@xmldom/xmldom` CVEs.
3. **Scoped Dev Overrides:** Astra may selectively evaluate `pnpm.overrides` for non-breaking dev-only tools (`shell-quote`, `form-data`) following single-package regression verifications.
