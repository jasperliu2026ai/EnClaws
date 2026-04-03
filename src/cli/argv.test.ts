import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  isRootHelpInvocation,
  isRootVersionInvocation,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "enclaws", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "enclaws", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "enclaws", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "enclaws", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "enclaws", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "enclaws", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "enclaws", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "enclaws", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "enclaws", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --version",
      argv: ["node", "enclaws", "--version"],
      expected: true,
    },
    {
      name: "root -V",
      argv: ["node", "enclaws", "-V"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "enclaws", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand version flag",
      argv: ["node", "enclaws", "status", "--version"],
      expected: false,
    },
    {
      name: "unknown root flag with version",
      argv: ["node", "enclaws", "--unknown", "--version"],
      expected: false,
    },
  ])("detects root-only version invocations: $name", ({ argv, expected }) => {
    expect(isRootVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --help",
      argv: ["node", "enclaws", "--help"],
      expected: true,
    },
    {
      name: "root -h",
      argv: ["node", "enclaws", "-h"],
      expected: true,
    },
    {
      name: "root --help with profile",
      argv: ["node", "enclaws", "--profile", "work", "--help"],
      expected: true,
    },
    {
      name: "subcommand --help",
      argv: ["node", "enclaws", "status", "--help"],
      expected: false,
    },
    {
      name: "help before subcommand token",
      argv: ["node", "enclaws", "--help", "status"],
      expected: false,
    },
    {
      name: "help after -- terminator",
      argv: ["node", "enclaws", "nodes", "run", "--", "git", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag before help",
      argv: ["node", "enclaws", "--unknown", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag after help",
      argv: ["node", "enclaws", "--help", "--unknown"],
      expected: false,
    },
  ])("detects root-only help invocations: $name", ({ argv, expected }) => {
    expect(isRootHelpInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "enclaws", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "enclaws", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "enclaws", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "enclaws", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "enclaws"],
      expected: null,
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "enclaws", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "enclaws", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "enclaws", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "enclaws", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "enclaws", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "enclaws", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "enclaws", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "enclaws", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "enclaws", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "enclaws", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "enclaws", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "enclaws", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "enclaws", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "enclaws", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "enclaws", "status"],
        expected: ["node", "enclaws", "status"],
      },
      {
        rawArgs: ["node-22", "enclaws", "status"],
        expected: ["node-22", "enclaws", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "enclaws", "status"],
        expected: ["node-22.2.0.exe", "enclaws", "status"],
      },
      {
        rawArgs: ["node-22.2", "enclaws", "status"],
        expected: ["node-22.2", "enclaws", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "enclaws", "status"],
        expected: ["node-22.2.exe", "enclaws", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "enclaws", "status"],
        expected: ["/usr/bin/node-22.2.0", "enclaws", "status"],
      },
      {
        rawArgs: ["node24", "enclaws", "status"],
        expected: ["node24", "enclaws", "status"],
      },
      {
        rawArgs: ["/usr/bin/node24", "enclaws", "status"],
        expected: ["/usr/bin/node24", "enclaws", "status"],
      },
      {
        rawArgs: ["node24.exe", "enclaws", "status"],
        expected: ["node24.exe", "enclaws", "status"],
      },
      {
        rawArgs: ["nodejs", "enclaws", "status"],
        expected: ["nodejs", "enclaws", "status"],
      },
      {
        rawArgs: ["node-dev", "enclaws", "status"],
        expected: ["node", "enclaws", "node-dev", "enclaws", "status"],
      },
      {
        rawArgs: ["enclaws", "status"],
        expected: ["node", "enclaws", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "enclaws",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "enclaws",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "enclaws", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "enclaws", "status"],
      ["node", "enclaws", "health"],
      ["node", "enclaws", "sessions"],
      ["node", "enclaws", "config", "get", "update"],
      ["node", "enclaws", "config", "unset", "update"],
      ["node", "enclaws", "models", "list"],
      ["node", "enclaws", "models", "status"],
      ["node", "enclaws", "memory", "status"],
      ["node", "enclaws", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "enclaws", "agents", "list"],
      ["node", "enclaws", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
