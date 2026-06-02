# Design System

## Overview
- Product surface for a family-only children social mini program.
- Visual goal: warm, cute, airy, tidy.
- Avoid noisy cartoon overload and avoid adult social app coldness.

## Color Strategy
- Strategy: Restrained leaning playful, with warm neutrals and clearly visible candy accents.
- Page background: soft warm gray or peach-tinted neutral.
- Surface background: off-white instead of pure white.
- Primary accent: watermelon coral for primary actions and key emphasis.
- Secondary accent: butter yellow / mint / sky used more visibly for section cues, chips, and feature blocks.
- Danger: muted berry red instead of harsh alarm red.
- Success: soft leaf green.

## Core Palette
- `--bg-page`: `#F6F3EE`
- `--bg-soft`: `#FFF7F2`
- `--bg-surface`: `#FFFCF8`
- `--bg-surface-strong`: `#FFFFFF`
- `--line-soft`: `#F0E4DA`
- `--text-primary`: `#2F2A26`
- `--text-secondary`: `#7A6F68`
- `--text-tertiary`: `#B3A59A`
- `--accent-primary`: `#F56B6F`
- `--accent-primary-strong`: `#E85A61`
- `--accent-primary-soft`: `#FFE5E1`
- `--accent-yellow`: `#F6C969`
- `--accent-mint`: `#8CCFBC`
- `--accent-sky`: `#94BEEA`
- `--success`: `#69B884`
- `--danger-soft`: `#FFF0F1`

## Typography
- Use the existing system font stack for native familiarity in WeChat.
- Prefer clear type hierarchy over decorative display fonts.
- Title: 40rpx to 44rpx, weight 700.
- Section title: 30rpx to 34rpx, weight 600.
- Body: 28rpx.
- Secondary body / meta: 22rpx to 24rpx.
- Line height should stay generous on text-heavy cards.

## Shape Language
- Large radii are part of the product personality.
- Main cards: 28rpx to 32rpx radius.
- Pills / chips / compact badges: 18rpx to 24rpx radius.
- Buttons: rounded capsule shapes, usually 44rpx half-height feel.
- Avoid sharp corners except for separators and tiny utility elements.

## Elevation
- Use soft layered shadows, not dark floating panels.
- Primary cards: gentle low-contrast shadow.
- Active / unread / highlighted cards: slightly warmer and deeper shadow.
- Avoid stacking cards inside cards unless structurally necessary.

## Layout
- Default horizontal page padding: 24rpx.
- Top sections need more breathing room than lower content blocks.
- Use rhythm: hero spacing > section spacing > item spacing.
- Prefer grouped sections with clear breaks instead of long uninterrupted white slabs.

## Components

### Page Hero
- Optional title block with short subtitle on pages that need orientation.
- Use especially on message, mine, post type selection, and identity creation.

### Cards
- Surfaces should feel soft and tactile.
- Differentiate default, active, unread, and disabled states with tint + shadow + text contrast.
- Let different functional areas borrow gentle accent tints so the app feels lively instead of monochrome.

### Buttons
- Primary buttons use coral gradient or solid coral when simpler is better.
- Secondary buttons use tinted neutral fills.
- Danger actions use pale red background with calm text color.

### Avatars
- Keep avatars playful, slightly larger on profile surfaces.
- Emoji avatars may sit on tinted background chips instead of plain circles when helpful.

### Empty States
- Use one emoji or illustration cue, one short title, one short explanation.
- Keep copy encouraging and action-oriented.

## Motion
- Use only for tap feedback, state confirmation, reveal, or unread transitions.
- Duration should stay within 150ms to 220ms.
- Avoid bouncy motion and avoid large-scale page choreography.

## Copy Tone
- Short, warm, direct.
- Encourage expression and participation.
- Prefer “说点什么”“发出去”“来看看” over abstract system wording.
