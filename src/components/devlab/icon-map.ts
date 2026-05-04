import {
  Cpu, Network, Layers, Database, Boxes, Terminal,
  Code2, Globe, Server, Lock, Wrench, BookOpen,
  Lightbulb, Zap, GitBranch, HardDrive, Shield,
  FileCode, BrainCircuit, Workflow,
  type LucideIcon,
} from 'lucide-react'

export const DEVLAB_ICON_MAP: Record<string, LucideIcon> = {
  Cpu, Network, Layers, Database, Boxes, Terminal,
  Code2, Globe, Server, Lock, Wrench, BookOpen,
  Lightbulb, Zap, GitBranch, HardDrive, Shield,
  FileCode, BrainCircuit, Workflow,
}

export const DEVLAB_ICON_NAMES = Object.keys(DEVLAB_ICON_MAP)

export function getDevLabIcon(name: string): LucideIcon {
  return DEVLAB_ICON_MAP[name] ?? Cpu
}
