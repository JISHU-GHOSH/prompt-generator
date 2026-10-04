/**
 * Promtify AI - Presets Registry
 * 
 * Defines standard prompt engineering presets for coding agents, RFC specs,
 * bug diagnosis, and IDE configuration rules.
 */

import { PresetConfig, PresetType } from '../../types';
import {
  CODING_AGENT_SYSTEM_PROMPT,
  RFC_SPEC_SYSTEM_PROMPT,
  BUGFIX_SYSTEM_PROMPT,
  CURSORRULES_SYSTEM_PROMPT,
} from './meta-prompts';

export const PRESETS: Record<PresetType, PresetConfig> = {
  'coding-agent': {
    id: 'coding-agent',
    name: 'Coding Agent',
    description: 'Optimized for Cursor, Claude Code, and Copilot with structured XML tags and clear execution steps.',
    icon: 'Bot',
    systemPrompt: CODING_AGENT_SYSTEM_PROMPT,
  },
  'rfc-spec': {
    id: 'rfc-spec',
    name: 'RFC & Architecture Spec',
    description: 'Comprehensive software architecture specification with schemas, system design, and API contracts.',
    icon: 'FileText',
    systemPrompt: RFC_SPEC_SYSTEM_PROMPT,
  },
  'bugfix': {
    id: 'bugfix',
    name: 'Bug Fix & Diagnosis',
    description: 'Systematic defect diagnosis with reproduction steps, root cause hypothesis, and regression tests.',
    icon: 'Bug',
    systemPrompt: BUGFIX_SYSTEM_PROMPT,
  },
  'cursorrules': {
    id: 'cursorrules',
    name: 'Cursor & IDE Rules',
    description: 'Developer guidelines and architectural constraints formatted for .cursorrules and .windsurfrules.',
    icon: 'Sliders',
    systemPrompt: CURSORRULES_SYSTEM_PROMPT,
  },
};

export const PRESET_LIST: PresetConfig[] = Object.values(PRESETS);

/**
 * Retrieves the configuration for a given preset type.
 * Throws an error if the preset is unknown.
 */
export function getPreset(preset: PresetType): PresetConfig {
  const config = PRESETS[preset];
  if (!config) {
    throw new Error(
      `Unknown preset "${preset}". Valid presets are: ${Object.keys(PRESETS).join(', ')}`
    );
  }
  return config;
}
