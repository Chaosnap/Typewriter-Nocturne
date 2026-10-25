// Design tokens → CSS custom properties for the Nocturne chrome (frame, toolbar, studio).
// Every value comes from a validated theme or validated settings, never from terminal output.

import type React from 'react';

import {activePaper} from '../../app/nocturne/apply-config';
import {mix, withAlpha} from '../../app/nocturne/color';
import {DISPLAY_SERIF, fontStack, UI_SERIF} from '../../app/nocturne/settings';
import type {NocturneSettings, NocturneTheme} from '../../app/nocturne/types';

export function lightColorOf(theme: NocturneTheme, settings: NocturneSettings): string {
  return settings.lighting.color || theme.light.color;
}

export function themeVariables(theme: NocturneTheme, settings: NocturneSettings): React.CSSProperties {
  const {palette, material} = theme;
  const light = lightColorOf(theme, settings);
  const position = settings.lighting.source === 'theme' ? theme.light.position : settings.lighting.position;
  const lightOn = settings.effects && settings.lighting.enabled && !settings.focusMode;
  const panelInk = theme.appearance === 'light' ? palette.paper : palette.ink;

  const variables: Record<string, string> = {
    '--tn-room': palette.room,
    '--tn-sheet': activePaper(settings).paper,
    '--tn-cursor': activePaper(settings).cursor,
    '--tn-room-edge': palette.roomEdge,
    '--tn-paper': palette.paper,
    '--tn-paper-edge': palette.paperEdge,
    '--tn-paper-shadow': palette.paperShadow,
    '--tn-ink': palette.ink,
    '--tn-ink-muted': palette.inkMuted,
    '--tn-ink-faint': palette.inkFaint,
    '--tn-accent': palette.accent,
    '--tn-accent-soft': palette.accentSoft,
    '--tn-border': palette.border,
    '--tn-metal': material.metal,
    '--tn-metal-hi': material.metalHighlight,
    '--tn-metal-lo': material.metalShadow,
    '--tn-ribbon': material.ribbon,
    '--tn-radius-window': `${material.radius.window}px`,
    '--tn-radius-paper': `${material.radius.paper}px`,
    '--tn-radius-control': `${material.radius.control}px`,
    '--tn-grain': String(material.grain),
    '--tn-light': light,
    '--tn-light-glow': withAlpha(light, lightOn ? 0.16 * Math.min(1.5, settings.lighting.intensity) : 0),
    '--tn-light-x': `${Math.round(position.x * 100)}%`,
    '--tn-light-y': `${Math.round(position.y * 100)}%`,
    '--tn-vignette': String(theme.atmosphere.vignette),
    '--tn-motion': String(theme.motion / settings.lighting.speed),
    '--tn-font-ui': UI_SERIF,
    '--tn-font-display': DISPLAY_SERIF,
    '--tn-font-mono': fontStack(settings.typography),
    '--tn-panel-bg': withAlpha(mix(palette.room, palette.paperEdge, 0.1), 0.94),
    '--tn-panel-ink': panelInk,
    '--tn-panel-muted': withAlpha(panelInk, 0.62),
    '--tn-panel-line': withAlpha(palette.accent, 0.35)
  };
  return variables as React.CSSProperties;
}
