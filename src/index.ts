#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { Council, formatResult } from "./council.js";
import { DEFAULT_MODELS } from "./openrouter.js";
import { createServer } from "./server.js";

const program = new Command();

program
  .name("cobblers")
  .description("Multi-agent deliberation CLI - let AI personas debate and synthesize")
  .version("0.1.0");

program
  .command("ask <question>")
  .description("Ask the council to deliberate on a question")
  .option("-a, --agents <number>", "Number of agents", "3")
  .option("-r, --rounds <number>", "Number of deliberation rounds", "2")
  .option("-m, --models <models>", "Comma-separated list of models", DEFAULT_MODELS.join(","))
  .option("--no-color", "Disable colored output")
  .action(async (question: string, options) => {
    try {
      const models = options.models.split(",").map((m: string) => m.trim());
      
      console.log("\n🪑 Council assembling...\n");
      
      const council = new Council({
        agents: parseInt(options.agents),
        rounds: parseInt(options.rounds),
        models,
        stream: true,
        onToken: (token) => process.stdout.write(token),
        onRoundStart: (round, persona) => {
          console.log(`\n\x1b[1m\x1b[33m─── Round ${round}: ${persona.name} ───\x1b[0m\n`);
        }
      });

      const result = await council.deliberate(question);
      
      // Print final synthesis header
      console.log(`\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m`);
      console.log(`\x1b[1mSYNTHESIS\x1b[0m`);
      console.log(`\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m\n`);
      
    } catch (error) {
      console.error("\x1b[31mError:\x1b[0m", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("review <file>")
  .description("Have the council review a code file")
  .option("-a, --agents <number>", "Number of reviewers", "3")
  .option("-r, --rounds <number>", "Number of review rounds", "2")
  .option("-m, --models <models>", "Comma-separated list of models", DEFAULT_MODELS.join(","))
  .action(async (file: string, options) => {
    try {
      const fileContent = readFileSync(file, "utf-8");
      const models = options.models.split(",").map((m: string) => m.trim());
      
      console.log(`\n🔍 Council reviewing ${file}...\n`);
      
      const council = new Council({
        agents: parseInt(options.agents),
        rounds: parseInt(options.rounds),
        models,
        stream: true,
        onToken: (token) => process.stdout.write(token),
        onRoundStart: (round, persona) => {
          console.log(`\n\x1b[1m\x1b[33m─── Round ${round}: ${persona.name} ───\x1b[0m\n`);
        }
      });

      await council.review(file, fileContent);
      
      console.log(`\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m`);
      console.log(`\x1b[1mSYNTHESIS\x1b[0m`);
      console.log(`\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m\n`);
      
    } catch (error) {
      console.error("\x1b[31mError:\x1b[0m", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("decide")
  .description("Have the council help make a decision between options")
  .option("-o, --options <options>", "Comma-separated list of options (required)")
  .option("-a, --agents <number>", "Number of agents", "3")
  .option("-r, --rounds <number>", "Number of deliberation rounds", "2")
  .option("-m, --models <models>", "Comma-separated list of models", DEFAULT_MODELS.join(","))
  .action(async (cmdOptions) => {
    try {
      if (!cmdOptions.options) {
        console.error("\x1b[31mError:\x1b[0m --options is required");
        process.exit(1);
      }
      
      const options = cmdOptions.options.split(",").map((o: string) => o.trim());
      const models = cmdOptions.models.split(",").map((m: string) => m.trim());
      
      if (options.length < 2) {
        console.error("\x1b[31mError:\x1b[0m At least 2 options are required");
        process.exit(1);
      }
      
      console.log("\n⚖️ Council deliberating on decision...\n");
      
      const council = new Council({
        agents: parseInt(cmdOptions.agents),
        rounds: parseInt(cmdOptions.rounds),
        models,
        stream: true,
        onToken: (token) => process.stdout.write(token),
        onRoundStart: (round, persona) => {
          console.log(`\n\x1b[1m\x1b[33m─── Round ${round}: ${persona.name} ───\x1b[0m\n`);
        }
      });

      await council.decide(options);
      
      console.log(`\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m`);
      console.log(`\x1b[1mSYNTHESIS\x1b[0m`);
      console.log(`\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m\n`);
      
    } catch (error) {
      console.error("\x1b[31mError:\x1b[0m", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("serve")
  .description("Start the web interface")
  .option("-p, --port <number>", "Port to listen on", "3000")
  .action((options) => {
    createServer(parseInt(options.port));
  });

program.parse();
