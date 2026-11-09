---
version: alpha
name: Paperlight
description: A quiet stationery-inspired Typora theme and its practical customization workspace.
colors:
  primary: "#5b7cfa"
  background: "#f7f6f3"
  surface: "#fffdfa"
  surfaceSecondary: "#f1efe9"
  text: "#2f3437"
  border: "#e5e2db"
  darkBackground: "#1b1c1f"
  darkSurface: "#23252a"
  darkText: "#d8dbe2"
typography:
  sans:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  mono:
    fontFamily: '"JetBrains Mono", monospace'
rounded:
  sm: "4px"
  DEFAULT: "6px"
  md: "8px"
  lg: "12px"
omitted:
  - section: spacing
    reason: Spacing follows the existing context-specific CSS rather than a shared numeric scale.
---

# Paperlight Design System

## Overview

Paperlight brings the quiet character of a paper notebook to Markdown editing. The configuration page is a practical companion: it lets a Typora user adjust the theme while seeing a representative document. It uses a product register, with Chinese interface copy and controls that describe their effects directly.

The editor theme remains the visual authority. `paperlight/style/theme.css` owns the light runtime tokens and component styles, and `paperlight/style/theme-dark.css` owns dark token overrides. The configurator's CSS is its application-shell adapter; generated user CSS overrides theme variables without replacing the theme. This document records the existing intent and does not generate runtime tokens.

## Colors

Warm paper and restrained borders organize the light theme; dark mode uses charcoal surfaces with the same hierarchy. Blue is the default adjustable accent, used for focus, selection, and small emphasis. Text and control states must remain legible when the accent or the document background changes.

## Typography

Use a Chinese-capable system sans stack for controls and prose, JetBrains Mono for code, and the bundled MiaoZi display face sparingly for document headings. Numeric settings and technical filenames should be easy to scan.

## Layout

Keep settings and live document preview visible together on wide screens. At narrow widths, stack them without horizontal overflow and keep saving and preview accessible. Group controls by their effect and keep related values beside the control.

## Elevation & Depth

Use surface changes and fine borders for separation. Reserve soft shadows for floating panels and feedback; the reading surface stays visually quiet.

## Shapes

Use small rounded corners, generally 4–12 px, with clear outlines. Avoid decorative, oversized cards or dramatic effects that compete with the document.

## Components

Inputs retain native semantics and visible keyboard focus. Selection, disabled, error, and save states must be understandable without color alone. Keep the preview representative of the actual light or dark theme and report whether a setting was saved or needs manual installation. Motion is brief and respects reduced-motion preferences.

## Do's and Don'ts

- Keep the preview and generated CSS driven by the same values.
- Preserve existing Typora customizations when writing generated settings.
- Do not hide browser limitations or imply that a download was installed automatically.
- Do not let interface decoration overpower the document being configured.
